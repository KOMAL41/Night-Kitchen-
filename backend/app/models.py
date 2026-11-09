"""SQLAlchemy models. Kept in one module by design (file-count budget).

Every business table carries kitchen_id, so the schema already supports
multiple kitchens even though v1 seeds and uses exactly one.
"""
import enum
from datetime import datetime

from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, ForeignKey, Enum, Text
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RoleEnum(str, enum.Enum):
    """User role enumeration values."""
    platform_admin = "platform_admin"
    hotel_manager = "hotel_manager"
    kitchen_staff = "kitchen_staff"
    delivery_partner = "delivery_partner"
    customer = "customer"


class OrderStatus(str, enum.Enum):
    """Order workflow status enumeration values."""
    pending = "pending"
    preparing = "preparing"
    ready = "ready"
    out_for_delivery = "out_for_delivery"
    completed = "completed"
    cancelled = "cancelled"


class TimestampMixin:
    """Mixin that adds created_at, updated_at, and soft delete flags."""
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)


class Kitchen(Base, TimestampMixin):
    """Represents a cloud kitchen tenant."""
    __tablename__ = "kitchens"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    plan: Mapped[str] = mapped_column(String(30), default="starter")

    users: Mapped[list["User"]] = relationship(back_populates="kitchen")
    products: Mapped[list["Product"]] = relationship(back_populates="kitchen")


class User(Base, TimestampMixin):
    """Represents an authenticated user account."""
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kitchen_id: Mapped[int] = mapped_column(ForeignKey("kitchens.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[RoleEnum] = mapped_column(Enum(RoleEnum), default=RoleEnum.customer)
    google_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    kitchen: Mapped["Kitchen"] = relationship(back_populates="users")


class Category(Base, TimestampMixin):
    """Represents a menu product category."""
    __tablename__ = "categories"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kitchen_id: Mapped[int] = mapped_column(ForeignKey("kitchens.id"), index=True)
    name: Mapped[str] = mapped_column(String(80))

    products: Mapped[list["Product"]] = relationship(back_populates="category")


class Product(Base, TimestampMixin):
    """A menu item. Doubles as the 'recipe' record (cost/margin fields)."""
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kitchen_id: Mapped[int] = mapped_column(ForeignKey("kitchens.id"), index=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[str] = mapped_column(String(500), default="")
    price: Mapped[float] = mapped_column(Float, default=0)
    cost: Mapped[float] = mapped_column(Float, default=0)
    rating: Mapped[float] = mapped_column(Float, default=4.5)
    orders_count: Mapped[int] = mapped_column(Integer, default=0)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)

    # Manager-controlled merchandising flags (replace the earlier client-side
    # heuristics — these are now real, editable fields).
    is_veg: Mapped[bool] = mapped_column(Boolean, default=True)
    is_bestseller: Mapped[bool] = mapped_column(Boolean, default=False)
    is_chef_special: Mapped[bool] = mapped_column(Boolean, default=False)
    is_trending: Mapped[bool] = mapped_column(Boolean, default=False)
    is_todays_special: Mapped[bool] = mapped_column(Boolean, default=False)

    kitchen: Mapped["Kitchen"] = relationship(back_populates="products")
    category: Mapped["Category"] = relationship(back_populates="products")

    @property
    def margin_percent(self) -> float:
        """Application helper function."""
        if not self.price:
            return 0
        return round(((self.price - self.cost) / self.price) * 100, 1)


class InventoryItem(Base, TimestampMixin):
    """Represents a kitchen inventory or supply item."""
    __tablename__ = "inventory_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kitchen_id: Mapped[int] = mapped_column(ForeignKey("kitchens.id"), index=True)
    name: Mapped[str] = mapped_column(String(150))
    unit: Mapped[str] = mapped_column(String(30), default="kg")
    quantity: Mapped[float] = mapped_column(Float, default=0)
    reorder_level: Mapped[float] = mapped_column(Float, default=0)
    supplier: Mapped[str] = mapped_column(String(150), default="")


class Employee(Base, TimestampMixin):
    """Represents a kitchen staff or delivery partner."""
    __tablename__ = "employees"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kitchen_id: Mapped[int] = mapped_column(ForeignKey("kitchens.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    role_title: Mapped[str] = mapped_column(String(80))
    phone: Mapped[str] = mapped_column(String(30), default="")
    shift: Mapped[str] = mapped_column(String(30), default="morning")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Customer(Base, TimestampMixin):
    """Represents a customer record linked to a user account."""
    __tablename__ = "customers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kitchen_id: Mapped[int] = mapped_column(ForeignKey("kitchens.id"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(30), default="")
    wallet_balance: Mapped[float] = mapped_column(Float, default=0)
    loyalty_points: Mapped[int] = mapped_column(Integer, default=0)


class Order(Base, TimestampMixin):
    """Represents a customer order with items and payment metadata."""
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kitchen_id: Mapped[int] = mapped_column(ForeignKey("kitchens.id"), index=True)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True)
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.pending)
    total_amount: Mapped[float] = mapped_column(Float, default=0)
    delivery_address: Mapped[str] = mapped_column(String(300), default="")
    payment_method: Mapped[str] = mapped_column(String(30), default="upi")

    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    combo_lines: Mapped[list["OrderComboLine"]] = relationship(back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    """Represents a line item within an order."""
    __tablename__ = "order_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    product_name: Mapped[str] = mapped_column(String(150))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Float, default=0)
    # When this row was generated by exploding a combo into its component
    # products (for kitchen prep + inventory + reporting), unit_price is 0
    # so revenue isn't double-counted — the combo's price lives on the
    # OrderComboLine instead. combo_line_id links the two.
    is_combo_item: Mapped[bool] = mapped_column(Boolean, default=False)
    combo_line_id: Mapped[int | None] = mapped_column(ForeignKey("order_combo_lines.id"), nullable=True)

    order: Mapped["Order"] = relationship(back_populates="items")


class OrderComboLine(Base):
    """One combo purchased within an order — the 'combo' line in the order summary."""
    __tablename__ = "order_combo_lines"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    combo_id: Mapped[int | None] = mapped_column(ForeignKey("combos.id"), nullable=True)
    combo_name: Mapped[str] = mapped_column(String(150))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Float, default=0)
    total_price: Mapped[float] = mapped_column(Float, default=0)

    order: Mapped["Order"] = relationship(back_populates="combo_lines")


class Notification(Base, TimestampMixin):
    """Represents a notification sent to a user."""
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kitchen_id: Mapped[int] = mapped_column(ForeignKey("kitchens.id"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(150))
    body: Mapped[str] = mapped_column(String(500), default="")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)


class Offer(Base, TimestampMixin):
    """A manager-created discount on one product, shown live in the customer app."""
    __tablename__ = "offers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kitchen_id: Mapped[int] = mapped_column(ForeignKey("kitchens.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    percent_off: Mapped[float] = mapped_column(Float, default=10)
    starts_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ends_at: Mapped[datetime] = mapped_column(DateTime)


class Combo(Base, TimestampMixin):
    """A bundled meal deal. Schema only for now — no management UI yet (see chat)."""
    __tablename__ = "combos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kitchen_id: Mapped[int] = mapped_column(ForeignKey("kitchens.id"), index=True)
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[str] = mapped_column(String(500), default="")
    combo_price: Mapped[float] = mapped_column(Float, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Review(Base, TimestampMixin):
    """A verified-purchase product review."""
    __tablename__ = "reviews"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kitchen_id: Mapped[int] = mapped_column(ForeignKey("kitchens.id"), index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    rating: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(150), default="")
    review: Mapped[str] = mapped_column(Text, default="")
    manager_reply: Mapped[str | None] = mapped_column(Text, nullable=True)
