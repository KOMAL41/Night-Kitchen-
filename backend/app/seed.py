"""Seed the database with a default kitchen, demo users, and menu items.

Run with:  python -m app.seed
"""
from app.database import Base, engine, SessionLocal
from app import models
from app.auth import hash_password

MENU = [
    dict(name="Cyber Hub Special Burger", category="Burgers",
         description="Premium beef style patty with smoked cheese",
         image_url="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600",
         price=299, cost=105, rating=4.8, orders_count=1670,
         is_veg=False, is_bestseller=False, is_chef_special=False, is_trending=True, is_todays_special=False),
    dict(name="Truffle Mushroom Pizza", category="Pizza",
         description="Wild mushrooms with truffle oil and mozzarella",
         image_url="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600",
         price=499, cost=180, rating=4.9, orders_count=980,
         is_veg=True, is_bestseller=False, is_chef_special=True, is_trending=False, is_todays_special=False),
    dict(name="Hyderabadi Chicken Biryani", category="Biryani",
         description="Dum cooked with saffron and fried onions",
         image_url="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600",
         price=379, cost=130, rating=4.8, orders_count=2890,
         is_veg=False, is_bestseller=True, is_chef_special=False, is_trending=False, is_todays_special=True),
    dict(name="Tiramisu", category="Desserts",
         description="Classic Italian dessert with coffee and mascarpone",
         image_url="https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600",
         price=179, cost=55, rating=4.9, orders_count=1230,
         is_veg=True, is_bestseller=False, is_chef_special=True, is_trending=False, is_todays_special=False),
    dict(name="Fresh Lime Soda", category="Beverages",
         description="Refreshing lime with soda and mint",
         image_url="https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600",
         price=69, cost=18, rating=4.5, orders_count=2100,
         is_veg=True, is_bestseller=True, is_chef_special=False, is_trending=False, is_todays_special=False),
    dict(name="Loaded Nachos", category="Sides",
         description="Cheese sauce with jalapenos and salsa",
         image_url="https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600",
         price=149, cost=48, rating=4.6, orders_count=1340,
         is_veg=True, is_bestseller=False, is_chef_special=False, is_trending=True, is_todays_special=False),
]

INVENTORY = [
    dict(name="Chicken Breast", unit="kg", quantity=42, reorder_level=15, supplier="Fresh Farms Co."),
    dict(name="Mozzarella Cheese", unit="kg", quantity=8, reorder_level=10, supplier="DairyBest Ltd."),
    dict(name="Basmati Rice", unit="kg", quantity=120, reorder_level=25, supplier="Grain Traders"),
    dict(name="Truffle Oil", unit="l", quantity=2, reorder_level=3, supplier="Gourmet Imports"),
]

EMPLOYEES = [
    dict(name="Rahul Sharma", role_title="Head Chef", phone="9876500001", shift="morning"),
    dict(name="Priya Nair", role_title="Kitchen Staff", phone="9876500002", shift="evening"),
    dict(name="Amit Verma", role_title="Delivery Partner", phone="9876500003", shift="evening"),
]

# One demo login per role, all sharing the same password for convenience.
DEMO_USERS = [
    dict(name="Platform Admin", email="platformadmin@darkkitchen.io", role=models.RoleEnum.platform_admin),
    dict(name="Hotel Manager", email="manager@darkkitchen.io", role=models.RoleEnum.hotel_manager),
    dict(name="Kitchen Staff", email="kitchenstaff@darkkitchen.io", role=models.RoleEnum.kitchen_staff),
    dict(name="Delivery Partner", email="delivery@darkkitchen.io", role=models.RoleEnum.delivery_partner),
    dict(name="Customer", email="customer@darkkitchen.io", role=models.RoleEnum.customer),
]
DEMO_PASSWORD = "Demo@123"


def run():
    """Seed the database with default demo data and initial kitchen records."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        kitchen = db.query(models.Kitchen).first()
        if not kitchen:
            kitchen = models.Kitchen(name="Cyber Hub Cloud Kitchen", plan="starter")
            db.add(kitchen)
            db.commit()
            db.refresh(kitchen)

        for demo in DEMO_USERS:
            if not db.query(models.User).filter(models.User.email == demo["email"]).first():
                db.add(models.User(
                    kitchen_id=kitchen.id, name=demo["name"], email=demo["email"],
                    hashed_password=hash_password(DEMO_PASSWORD), role=demo["role"],
                ))

        cat_cache = {}
        if not db.query(models.Product).first():
            for item in MENU:
                cat_name = item.pop("category")
                cat = cat_cache.get(cat_name)
                if not cat:
                    cat = db.query(models.Category).filter(
                        models.Category.kitchen_id == kitchen.id, models.Category.name == cat_name
                    ).first()
                    if not cat:
                        cat = models.Category(kitchen_id=kitchen.id, name=cat_name)
                        db.add(cat)
                        db.flush()
                    cat_cache[cat_name] = cat
                db.add(models.Product(kitchen_id=kitchen.id, category_id=cat.id, **item))

        if not db.query(models.InventoryItem).first():
            for item in INVENTORY:
                db.add(models.InventoryItem(kitchen_id=kitchen.id, **item))

        if not db.query(models.Employee).first():
            for emp in EMPLOYEES:
                db.add(models.Employee(kitchen_id=kitchen.id, **emp))

        db.commit()
        print("Seed complete. Demo logins (all use password: Demo@123):")
        for demo in DEMO_USERS:
            print(f"  {demo['role'].value:18s} -> {demo['email']}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
