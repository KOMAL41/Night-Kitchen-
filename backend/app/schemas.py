"""Pydantic request/response schemas, grouped by resource."""
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict, Field

# ---------- Auth ----------
class RegisterIn(BaseModel):
    """Request model for user registration."""
    name: str
    email: EmailStr
    password: str
    role: str = "customer"


class LoginIn(BaseModel):
    """Request model for user login."""
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    """Response model for authentication tokens and user profile."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserOut"


class RefreshIn(BaseModel):
    """Request model for exchanging a refresh token for new authentication tokens."""
    refresh_token: str


class UserOut(BaseModel):
    """Response model for a user profile."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    role: str
    kitchen_id: int


TokenOut.model_rebuild()


# ---------- Category ----------
class CategoryOut(BaseModel):
    """Response model for category data."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


# ---------- Product ----------
class ProductIn(BaseModel):
    """Request model for creating or updating a product."""
    name: str
    description: str = ""
    image_url: str = ""
    price: float
    cost: float = 0
    category_id: int | None = None
    is_available: bool = True
    is_veg: bool = True
    is_bestseller: bool = False
    is_chef_special: bool = False
    is_trending: bool = False
    is_todays_special: bool = False


class ProductOut(BaseModel):
    """Response model for menu product data."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str
    image_url: str
    price: float
    cost: float
    rating: float
    orders_count: int
    is_available: bool
    category_id: int | None = None
    is_veg: bool = True
    is_bestseller: bool = False
    is_chef_special: bool = False
    is_trending: bool = False
    is_todays_special: bool = False
    # Real, database-backed rating info (see reviews section below).
    # avg_rating/review_count reflect actual submitted reviews; when a
    # product has zero reviews yet, avg_rating falls back to the seeded
    # `rating` value above so cards aren't blank, and review_count is 0 —
    # the frontend is expected to treat review_count == 0 as "no reviews yet".
    avg_rating: float = 0
    review_count: int = 0
    discounted_price: float | None = None


# ---------- Inventory ----------
class InventoryIn(BaseModel):
    """Request model for inventory items."""
    name: str
    unit: str = "kg"
    quantity: float = Field(ge=0)
    reorder_level: float = Field(default=0, ge=0)
    supplier: str = ""


class InventoryOut(InventoryIn):
    """Response model for inventory item data."""
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Employee ----------
class EmployeeIn(BaseModel):
    """Request model for employee data."""
    name: str
    role_title: str
    phone: str = ""
    shift: str = "morning"
    is_active: bool = True


class EmployeeOut(EmployeeIn):
    """Response model for employee data."""
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Orders ----------
class OrderItemIn(BaseModel):
    """Request model for an order line item."""
    product_id: int = Field(gt=0)
    quantity: int = Field(default=1, gt=0)


class OrderIn(BaseModel):
    """Request model for placing an order."""
    delivery_address: str = ""
    payment_method: str = "cod"
    items: list[OrderItemIn] = Field(min_length=1)


class OrderItemOut(BaseModel):
    """Response model for an order line item."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: float


class OrderOut(BaseModel):
    """Response model for order details."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str
    total_amount: float
    delivery_address: str
    payment_method: str
    created_at: datetime
    items: list[OrderItemOut] = []


class OrderStatusIn(BaseModel):
    """Request model for order status updates."""
    status: str


# ---------- Dashboard ----------
class DashboardOut(BaseModel):
    """Response model for dashboard analytics."""
    revenue_today: float
    orders_today: int
    active_orders: int
    avg_order_value: float
    low_stock_count: int
    top_products: list[dict]
    revenue_trend: list[dict]


# ---------- Offers ----------
class OfferIn(BaseModel):
    """Request model for creating an offer."""
    product_id: int
    name: str
    percent_off: float
    ends_at: datetime


class OfferOut(BaseModel):
    """Response model for offer data."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    product_name: str = ""
    name: str
    percent_off: float
    starts_at: datetime
    ends_at: datetime
    original_price: float = 0
    discounted_price: float = 0


# ---------- Reviews ----------
class ReviewIn(BaseModel):
    """Request model for submitting a review."""
    order_id: int
    product_id: int
    rating: int
    title: str = ""
    review: str = ""


class ReviewUpdateIn(BaseModel):
    """Request model for updating a review."""
    rating: int
    title: str = ""
    review: str = ""


class ReviewReplyIn(BaseModel):
    """Request model for a manager review reply."""
    manager_reply: str


class ReviewOut(BaseModel):
    """Response model for review data."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    customer_id: int
    customer_name: str = ""
    product_id: int
    product_name: str = ""
    order_id: int
    rating: int
    title: str
    review: str
    manager_reply: str | None = None
    created_at: datetime
    updated_at: datetime


class ProductRatingSummary(BaseModel):
    """Response model summarizing product rating data."""
    product_id: int
    product_name: str
    avg_rating: float
    review_count: int
