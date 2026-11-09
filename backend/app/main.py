"""Dark Kitchen Mafia OS - FastAPI backend.

Routers are kept in this single module (by design, per the project's
file-count budget) but organised into clearly separated sections.
Run with:  python -m uvicorn app.main:app --reload
"""
from datetime import datetime, timedelta

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.config import settings
from app.database import Base, engine, get_db
from app import models, schemas
from app.auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    get_current_user, get_user_from_refresh_token, require_roles,
)

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.app_url, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    """Create tables and ensure the default kitchen record exists when the application starts."""
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    if not db.query(models.Kitchen).first():
        kitchen = models.Kitchen(name="Cyber Hub Cloud Kitchen", plan="starter")
        db.add(kitchen)
        db.commit()
    db.close()


def default_kitchen_id(db: Session) -> int:
    """Return the default kitchen id for queries using the seeded kitchen."""
    return db.query(models.Kitchen).first().id


@app.get("/api/health")
def health():
    """Return a simple health-check response for the API."""
    return {"status": "ok", "app": settings.app_name}


# ============================== AUTH ==============================
@app.post("/api/auth/register", response_model=schemas.TokenOut)
def register(payload: schemas.RegisterIn, db: Session = Depends(get_db)):
    """Register a new user, hash their password, and return authentication tokens."""
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(400, "Email already registered")
    kitchen_id = default_kitchen_id(db)
    user = models.User(
        kitchen_id=kitchen_id,
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role="customer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return schemas.TokenOut(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=schemas.UserOut.model_validate(user),
    )


@app.post("/api/auth/login", response_model=schemas.TokenOut)
def login(payload: schemas.LoginIn, db: Session = Depends(get_db)):
    """Authenticate a user and return access and refresh tokens."""
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(401, "Invalid email or password")
    return schemas.TokenOut(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=schemas.UserOut.model_validate(user),
    )


@app.post("/api/auth/refresh", response_model=schemas.TokenOut)
def refresh(payload: schemas.RefreshIn, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a new access token."""
    user = get_user_from_refresh_token(payload.refresh_token, db)
    return schemas.TokenOut(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=schemas.UserOut.model_validate(user),
    )


@app.get("/api/auth/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    """Return the currently authenticated user profile."""
    return user


# ============================== CATEGORIES ==============================
@app.get("/api/categories", response_model=list[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    """List all categories available for the default kitchen."""
    kid = default_kitchen_id(db)
    return db.query(models.Category).filter(models.Category.kitchen_id == kid).all()


# ============================== PRODUCTS / MENU ==============================
def _active_offer_for_product(db: Session, product: models.Product) -> models.Offer | None:
    """Fetch any currently active offer for a product."""
    now = datetime.utcnow()
    return (
        db.query(models.Offer)
        .filter(models.Offer.product_id == product.id, models.Offer.ends_at >= now)
        .order_by(models.Offer.percent_off.desc())
        .first()
    )


def _effective_price(product: models.Product, offer: models.Offer | None) -> float:
    """Compute the effective selling price for a product using an active discount if available."""
    if offer:
        discounted_price = round(product.price * (1 - offer.percent_off / 100), 2)
        if discounted_price < product.price:
            return discounted_price
    return product.price


def _product_out(db: Session, product: models.Product) -> schemas.ProductOut:
    """Build a ProductOut payload including rating aggregates and effective discount pricing."""
    agg = db.query(
        func.avg(models.Review.rating), func.count(models.Review.id)
    ).filter(models.Review.product_id == product.id).one()
    avg_rating, review_count = agg[0], agg[1] or 0
    out = schemas.ProductOut.model_validate(product)
    out.avg_rating = float(round(avg_rating, 1)) if avg_rating else float(product.rating)
    out.review_count = review_count
    offer = _active_offer_for_product(db, product)
    discounted_price = _effective_price(product, offer)
    out.discounted_price = discounted_price if discounted_price < product.price else None
    return out


def _products_with_ratings(db: Session, products: list[models.Product]) -> list[schemas.ProductOut]:
    """Build ProductOut payloads for multiple products with aggregated ratings."""
    if not products:
        return []
    ids = [p.id for p in products]
    rows = (
        db.query(models.Review.product_id, func.avg(models.Review.rating), func.count(models.Review.id))
        .filter(models.Review.product_id.in_(ids))
        .group_by(models.Review.product_id)
        .all()
    )
    stats = {r[0]: (r[1], r[2]) for r in rows}
    out = []
    for p in products:
        item = schemas.ProductOut.model_validate(p)
        avg_rating, review_count = stats.get(p.id, (None, 0))
        item.avg_rating = float(round(avg_rating, 1)) if avg_rating else float(p.rating)
        item.review_count = review_count
        offer = _active_offer_for_product(db, p)
        discounted_price = _effective_price(p, offer)
        item.discounted_price = discounted_price if discounted_price < p.price else None
        out.append(item)
    return out


@app.get("/api/products", response_model=list[schemas.ProductOut])
def list_products(
    search: str | None = None,
    category_id: int | None = None,
    db: Session = Depends(get_db),
):
    """Return a list of products for the current kitchen, optionally filtered by search or category."""
    kid = default_kitchen_id(db)
    q = db.query(models.Product).filter(
        models.Product.kitchen_id == kid, models.Product.is_deleted == False
    )
    if search:
        q = q.filter(models.Product.name.ilike(f"%{search}%"))
    if category_id:
        q = q.filter(models.Product.category_id == category_id)
    return _products_with_ratings(db, q.order_by(models.Product.id).all())


@app.post("/api/products", response_model=schemas.ProductOut)
def create_product(
    payload: schemas.ProductIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("platform_admin", "hotel_manager")),
):
    """Create a new menu product in the default kitchen."""
    kid = default_kitchen_id(db)
    product = models.Product(kitchen_id=kid, **payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return _product_out(db, product)


@app.put("/api/products/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: int,
    payload: schemas.ProductIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("platform_admin", "hotel_manager")),
):
    """Update an existing menu product record."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    for k, v in payload.model_dump().items():
        setattr(product, k, v)
    db.commit()
    db.refresh(product)
    return _product_out(db, product)


@app.patch("/api/products/{product_id}/toggle", response_model=schemas.ProductOut)
def toggle_product(
    product_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("platform_admin", "hotel_manager", "kitchen_staff")),
):
    """Toggle a product between available and unavailable states."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    product.is_available = not product.is_available
    db.commit()
    db.refresh(product)
    return _product_out(db, product)


@app.delete("/api/products/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("platform_admin", "hotel_manager")),
):
    """Soft-delete a product so it no longer appears in the menu."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    product.is_deleted = True
    db.commit()
    return {"detail": "Product deleted"}


# ============================== INVENTORY ==============================
@app.get("/api/inventory", response_model=list[schemas.InventoryOut])
def list_inventory(db: Session = Depends(get_db)):
    """Return inventory items for the current kitchen."""
    kid = default_kitchen_id(db)
    return db.query(models.InventoryItem).filter(models.InventoryItem.kitchen_id == kid).all()


@app.post("/api/inventory", response_model=schemas.InventoryOut)
def create_inventory(
    payload: schemas.InventoryIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("platform_admin", "hotel_manager")),
):
    """Create a new inventory item record."""
    kid = default_kitchen_id(db)
    item = models.InventoryItem(kitchen_id=kid, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.put("/api/inventory/{item_id}", response_model=schemas.InventoryOut)
def update_inventory(
    item_id: int,
    payload: schemas.InventoryIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("platform_admin", "hotel_manager")),
):
    """Update an existing inventory item."""
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Inventory item not found")
    for k, v in payload.model_dump().items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


@app.delete("/api/inventory/{item_id}")
def delete_inventory(
    item_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("platform_admin", "hotel_manager")),
):
    """Delete an inventory item from the kitchen inventory."""
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Inventory item not found")
    db.delete(item)
    db.commit()
    return {"detail": "Inventory item deleted"}


# ============================== EMPLOYEES ==============================
@app.get("/api/employees", response_model=list[schemas.EmployeeOut])
def list_employees(db: Session = Depends(get_db)):
    """Return employees for the current kitchen."""
    kid = default_kitchen_id(db)
    return db.query(models.Employee).filter(models.Employee.kitchen_id == kid).all()


@app.post("/api/employees", response_model=schemas.EmployeeOut)
def create_employee(
    payload: schemas.EmployeeIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("platform_admin", "hotel_manager")),
):
    """Create a new employee record."""
    kid = default_kitchen_id(db)
    emp = models.Employee(kitchen_id=kid, **payload.model_dump())
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


@app.delete("/api/employees/{employee_id}")
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("platform_admin", "hotel_manager")),
):
    """Delete an employee record."""
    emp = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    db.delete(emp)
    db.commit()
    return {"detail": "Employee deleted"}


# ============================== ORDERS ==============================
@app.get("/api/orders", response_model=list[schemas.OrderOut])
def list_orders(
    status: str | None = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("platform_admin", "hotel_manager", "kitchen_staff", "delivery_partner")),
):
    """List orders for the kitchen with optional status filtering."""
    kid = default_kitchen_id(db)
    q = db.query(models.Order).filter(models.Order.kitchen_id == kid)
    if status:
        q = q.filter(models.Order.status == status)
    return q.order_by(models.Order.id.desc()).all()


@app.get("/api/orders/mine", response_model=list[schemas.OrderOut])
def list_my_orders(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """Order history + live tracking for the logged-in customer."""
    customer = db.query(models.Customer).filter(models.Customer.user_id == user.id).first()
    if not customer:
        return []
    return (
        db.query(models.Order)
        .filter(models.Order.customer_id == customer.id)
        .order_by(models.Order.id.desc())
        .all()
    )


@app.post("/api/orders", response_model=schemas.OrderOut)
def create_order(
    payload: schemas.OrderIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Create a new customer order and compute totals from effective prices."""
    kid = default_kitchen_id(db)

    order_lines = []
    for item in payload.items:
        product = (
            db.query(models.Product)
            .filter(
                models.Product.id == item.product_id,
                models.Product.kitchen_id == kid,
                models.Product.is_deleted == False,
            )
            .first()
        )
        if not product:
            raise HTTPException(404, f"Product {item.product_id} not found")
        if not product.is_available:
            raise HTTPException(409, f"Product {item.product_id} is unavailable")
        order_lines.append((item, product))

    customer = db.query(models.Customer).filter(models.Customer.user_id == user.id).first()
    if not customer:
        customer = models.Customer(kitchen_id=kid, user_id=user.id, name=user.name)
        db.add(customer)
        db.flush()

    order = models.Order(
        kitchen_id=kid,
        customer_id=customer.id,
        delivery_address=payload.delivery_address,
        payment_method="cod",  # Razorpay/UPI not wired up yet — cash on delivery only
    )
    total = 0.0
    for item, product in order_lines:
        offer = _active_offer_for_product(db, product)
        unit_price = _effective_price(product, offer)
        line_total = unit_price * item.quantity
        total += line_total
        order.items.append(models.OrderItem(
            product_id=product.id,
            product_name=product.name,
            quantity=item.quantity,
            unit_price=unit_price,
        ))
        product.orders_count += item.quantity
    order.total_amount = round(total, 2)
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@app.patch("/api/orders/{order_id}/status", response_model=schemas.OrderOut)
def update_order_status(
    order_id: int,
    payload: schemas.OrderStatusIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("platform_admin", "hotel_manager", "kitchen_staff", "delivery_partner")),
):
    """Update the workflow status of an existing order."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if payload.status not in [s.value for s in models.OrderStatus]:
        raise HTTPException(400, "Invalid status")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order


# ============================== OFFERS ==============================
@app.get("/api/offers", response_model=list[schemas.OfferOut])
def list_offers(db: Session = Depends(get_db)):
    """Active offers right now — this is what the customer app shows."""
    kid = default_kitchen_id(db)
    now = datetime.utcnow()
    offers = (
        db.query(models.Offer)
        .filter(models.Offer.kitchen_id == kid, models.Offer.ends_at >= now)
        .order_by(models.Offer.ends_at)
        .all()
    )
    out = []
    for o in offers:
        product = db.query(models.Product).filter(models.Product.id == o.product_id).first()
        if not product:
            continue
        out.append(schemas.OfferOut(
            id=o.id, product_id=o.product_id, product_name=product.name,
            name=o.name, percent_off=o.percent_off, starts_at=o.starts_at, ends_at=o.ends_at,
            original_price=product.price,
            discounted_price=round(product.price * (1 - o.percent_off / 100), 2),
        ))
    return out


@app.post("/api/offers", response_model=schemas.OfferOut)
def create_offer(
    payload: schemas.OfferIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("platform_admin", "hotel_manager")),
):
    """Create a new discount offer for a product."""
    kid = default_kitchen_id(db)
    product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    offer = models.Offer(
        kitchen_id=kid, product_id=payload.product_id, name=payload.name,
        percent_off=payload.percent_off, ends_at=payload.ends_at,
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return schemas.OfferOut(
        id=offer.id, product_id=offer.product_id, product_name=product.name,
        name=offer.name, percent_off=offer.percent_off, starts_at=offer.starts_at, ends_at=offer.ends_at,
        original_price=product.price, discounted_price=round(product.price * (1 - offer.percent_off / 100), 2),
    )


@app.delete("/api/offers/{offer_id}")
def delete_offer(
    offer_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("platform_admin", "hotel_manager")),
):
    """Delete an existing discount offer."""
    offer = db.query(models.Offer).filter(models.Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(404, "Offer not found")
    db.delete(offer)
    db.commit()
    return {"detail": "Offer deleted"}


# ============================== REVIEWS ==============================
def _review_out(db: Session, r: models.Review) -> schemas.ReviewOut:
    """Build a ReviewOut object with customer and product display names."""
    customer = db.query(models.Customer).filter(models.Customer.id == r.customer_id).first()
    product = db.query(models.Product).filter(models.Product.id == r.product_id).first()
    out = schemas.ReviewOut.model_validate(r)
    out.customer_name = customer.name if customer else "Customer"
    out.product_name = product.name if product else ""
    return out


@app.post("/api/reviews", response_model=schemas.ReviewOut)
def create_review(
    payload: schemas.ReviewIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Create a review for a completed order item."""
    customer = db.query(models.Customer).filter(models.Customer.user_id == user.id).first()
    if not customer:
        raise HTTPException(403, "Only customers can leave reviews")

    order = db.query(models.Order).filter(
        models.Order.id == payload.order_id, models.Order.customer_id == customer.id
    ).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status != "completed":
        raise HTTPException(400, "You can only review items from delivered orders")
    if not any(i.product_id == payload.product_id for i in order.items):
        raise HTTPException(400, "This product wasn't part of that order")
    if not (1 <= payload.rating <= 5):
        raise HTTPException(400, "Rating must be between 1 and 5")

    existing = db.query(models.Review).filter(
        models.Review.customer_id == customer.id, models.Review.product_id == payload.product_id
    ).first()
    if existing:
        raise HTTPException(400, "You've already reviewed this item — edit your existing review instead")

    kid = default_kitchen_id(db)
    review = models.Review(
        kitchen_id=kid, customer_id=customer.id, product_id=payload.product_id, order_id=payload.order_id,
        rating=payload.rating, title=payload.title, review=payload.review,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return _review_out(db, review)


@app.put("/api/reviews/{review_id}", response_model=schemas.ReviewOut)
def update_review(
    review_id: int,
    payload: schemas.ReviewUpdateIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Update an existing customer review."""
    customer = db.query(models.Customer).filter(models.Customer.user_id == user.id).first()
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review or not customer or review.customer_id != customer.id:
        raise HTTPException(404, "Review not found")
    if not (1 <= payload.rating <= 5):
        raise HTTPException(400, "Rating must be between 1 and 5")
    review.rating = payload.rating
    review.title = payload.title
    review.review = payload.review 
    db.commit()
    db.refresh(review)
    return _review_out(db, review)


@app.delete("/api/reviews/{review_id}")
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Delete a customer review."""
    customer = db.query(models.Customer).filter(models.Customer.user_id == user.id).first()
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review or not customer or review.customer_id != customer.id:
        raise HTTPException(404, "Review not found")
    db.delete(review)
    db.commit()
    return {"detail": "Review deleted"}


@app.get("/api/reviews/mine", response_model=list[schemas.ReviewOut])
def my_reviews(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """So the customer app can show 'edit' instead of 'rate' for items already reviewed."""
    customer = db.query(models.Customer).filter(models.Customer.user_id == user.id).first()
    if not customer:
        return []
    reviews = db.query(models.Review).filter(models.Review.customer_id == customer.id).all()
    return [_review_out(db, r) for r in reviews]


@app.get("/api/products/{product_id}/reviews", response_model=list[schemas.ReviewOut])
def product_reviews(
    product_id: int,
    sort: str = Query("latest", pattern="^(latest|highest|lowest)$"),
    db: Session = Depends(get_db),
):
    """Return reviews for a product sorted by the requested order."""
    q = db.query(models.Review).filter(models.Review.product_id == product_id)
    if sort == "highest":
        q = q.order_by(models.Review.rating.desc(), models.Review.created_at.desc())
    elif sort == "lowest":
        q = q.order_by(models.Review.rating.asc(), models.Review.created_at.desc())
    else:
        q = q.order_by(models.Review.created_at.desc())
    return [_review_out(db, r) for r in q.all()]


@app.get("/api/reviews", response_model=list[schemas.ReviewOut])
def list_all_reviews(
    product_id: int | None = None,
    rating: int | None = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("platform_admin", "hotel_manager")),
):
    
    """Return all reviews for the kitchen with optional filters."""
    kid = default_kitchen_id(db)
    q = db.query(models.Review).filter(models.Review.kitchen_id == kid)
    if product_id:
        q = q.filter(models.Review.product_id == product_id)
    if rating:
        q = q.filter(models.Review.rating == rating)
    q = q.order_by(models.Review.created_at.desc())
    return [_review_out(db, r) for r in q.all()]


@app.patch("/api/reviews/{review_id}/reply", response_model=schemas.ReviewOut)
def reply_to_review(
    review_id: int,
    payload: schemas.ReviewReplyIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("platform_admin", "hotel_manager")),
):
    """Save a manager reply to a customer review."""
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(404, "Review not found")
    review.manager_reply = payload.manager_reply
    db.commit()
    db.refresh(review)
    return _review_out(db, review)


@app.get("/api/reviews/summary", response_model=list[schemas.ProductRatingSummary])
def reviews_summary(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("platform_admin", "hotel_manager")),
):
    """Highest/lowest rated products report — computed from real review data."""
    kid = default_kitchen_id(db)
    rows = (
        db.query(
            models.Review.product_id, func.avg(models.Review.rating), func.count(models.Review.id)
        )
        .filter(models.Review.kitchen_id == kid)
        .group_by(models.Review.product_id)
        .all()
    )
    out = []
    for product_id, avg_rating, count in rows:
        product = db.query(models.Product).filter(models.Product.id == product_id).first()
        if not product:
            continue
        out.append(schemas.ProductRatingSummary(
            product_id=product_id, product_name=product.name,
            avg_rating=round(avg_rating, 2), review_count=count,
        ))
    out.sort(key=lambda x: x.avg_rating, reverse=True)
    return out


# ============================== DASHBOARD / ANALYTICS ==============================
@app.get("/api/dashboard", response_model=schemas.DashboardOut)
def dashboard(db: Session = Depends(get_db)):
    """Compute dashboard analytics metrics for the default kitchen."""
    kid = default_kitchen_id(db)
    today = datetime.utcnow().date()

    today_orders = db.query(models.Order).filter(
        models.Order.kitchen_id == kid,
        func.date(models.Order.created_at) == today,
    ).all()
    revenue_today = sum(o.total_amount for o in today_orders)
    active_orders = db.query(models.Order).filter(
        models.Order.kitchen_id == kid,
        models.Order.status.in_(["pending", "preparing", "ready", "out_for_delivery"]),
    ).count()
    avg_order_value = round(revenue_today / len(today_orders), 2) if today_orders else 0

    low_stock_count = db.query(models.InventoryItem).filter(
        models.InventoryItem.kitchen_id == kid,
        models.InventoryItem.quantity <= models.InventoryItem.reorder_level,
    ).count()

    top_products = (
        db.query(models.Product)
        .filter(models.Product.kitchen_id == kid)
        .order_by(models.Product.orders_count.desc())
        .limit(5)
        .all()
    )

    trend = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_orders = db.query(models.Order).filter(
            models.Order.kitchen_id == kid, func.date(models.Order.created_at) == day
        ).all()
        trend.append({"date": day.isoformat(), "revenue": sum(o.total_amount for o in day_orders)})

    return schemas.DashboardOut(
        revenue_today=revenue_today,
        orders_today=len(today_orders),
        active_orders=active_orders,
        avg_order_value=avg_order_value,
        low_stock_count=low_stock_count,
        top_products=[{"name": p.name, "orders": p.orders_count} for p in top_products],
        revenue_trend=trend,
    )
