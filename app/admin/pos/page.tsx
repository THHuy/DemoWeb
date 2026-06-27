"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import { useRouter } from "next/navigation";
import {
  Monitor,
  Printer,
  Fingerprint,
  Wifi,
  WifiOff,
  Save,
  RotateCcw,
  ChevronRight,
  Search,
  ShoppingCart,
  Users,
  MapPin,
  Clock,
  Check,
  QrCode,
  X,
  Plus,
  Loader2,
  Minus,
  Trash2,
  Settings,
  Coffee,
  HelpCircle,
  TrendingUp,
  Percent,
  CheckCircle,
  Play,
  RotateCw,
  Sliders,
  Bell,
  Utensils,
  ChevronDown,
  Volume2,
  VolumeX,
  FileText,
  DollarSign,
  UserCheck,
  Split,
  FileSpreadsheet,
  AlertTriangle,
  History,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: string; // "69.000đ"
  description: string;
  image_url: string;
  price_s?: number | null;
  price_m?: number | null;
  price_l?: number | null;
}

interface InventoryItem {
  menuItemId: number;
  stockQuantity: number;
  minThreshold: number;
}

interface CartTopping {
  name: string;
  price: number;
}

interface CartItem {
  id: string; // unique cart line id
  menuItemId: number;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
  size: "S" | "M" | "L";
  iceLevel: "0%" | "30%" | "50%" | "70%" | "100%";
  sugarLevel: "0%" | "30%" | "50%" | "70%" | "100%";
  temperature: "cold" | "hot";
  toppings: CartTopping[];
  notes: string;
  voided?: boolean;
  voidReason?: string;
  voidApprovedBy?: string;
}

interface Table {
  id: number;
  table_number: string;
  capacity: number;
  status?: "empty" | "serving" | "booked" | "paying" | "cleaning";
  current_order_id?: number;
}

interface Order {
  id: number;
  orderCode: string;
  tableId: number | null;
  tableNumber: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  orderType: "dine_in" | "take_away" | "delivery";
  deliveryPartner: "grab" | "shopee" | "befood" | "internal" | null;
  status: "draft" | "sent_kitchen" | "preparing" | "completed" | "served" | "paid" | "done" | "cancelled";
  notes: string;
  discountType: "percentage" | "amount" | null;
  discountValue: number;
  discountReason: string;
  vatRate: number;
  surcharge: number;
  subtotal: number;
  totalAmount: number;
  paymentMethods: { method: string; amount: number }[];
  creatorName: string;
  createdAt: string;
  items: CartItem[];
}



function getCashSuggestions(total: number): number[] {
  if (total <= 0) return [];
  const suggestions = new Set<number>();
  suggestions.add(total);

  const bills = [10000, 20000, 50000, 100000, 200000, 500000];
  const nextBill = bills.find(b => b >= total);
  if (nextBill) {
    suggestions.add(nextBill);
  }

  if (total < 100000) suggestions.add(100000);
  if (total < 200000) suggestions.add(200000);
  if (total < 500000) suggestions.add(500000);

  const next10k = Math.ceil(total / 10000) * 10000;
  const next50k = Math.ceil(total / 50000) * 50000;
  const next100k = Math.ceil(total / 100000) * 100000;

  suggestions.add(next10k);
  suggestions.add(next50k);
  suggestions.add(next100k);

  const changeOptions = [10000, 20000, 50000];
  changeOptions.forEach(change => {
    suggestions.add(total + change);
  });

  return Array.from(suggestions)
    .filter(val => val >= total)
    .sort((a, b) => a - b)
    .slice(0, 6);
}

export default function POSPage() {
  const { user } = useAuth();
  const router = useRouter();

  // General POS States
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [inventory, setInventory] = useState<Record<number, number>>({});
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [orderType, setOrderType] = useState<"dine_in" | "take_away" | "delivery">("dine_in");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  // Delivery Customer Details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [deliveryPartner, setDeliveryPartner] = useState<"grab" | "shopee" | "befood" | "internal">("internal");

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);
  
  // Promotion Voucher
  const [voucherCode, setVoucherCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "amount" | null>(null);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  
  // Extra surcharge
  const [surcharge, setSurcharge] = useState(0);

  // Offline Mode & Synced State
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [offlineOrders, setOfflineOrders] = useState<any[]>([]);

  // Sound and Audio System
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Active Screen Panel
  const [activeModal, setActiveModal] = useState<"tables" | "kds" | "checkout" | "reports" | "audits" | "voidConfirm" | "splitBill" | "quickAdd" | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Void confirmation state
  const [itemToVoid, setItemToVoid] = useState<{ orderId: number; itemId: string } | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidSupervisor, setVoidSupervisor] = useState("");

  // Split bill state
  const [itemsToSplit, setItemsToSplit] = useState<Record<string, number>>({}); // cartItemId -> quantity to split

  // Checkout State
  const [paymentMethods, setPaymentMethods] = useState<{ method: string; amount: number }[]>([
    { method: "cash", amount: 0 }
  ]);
  const [cashReceived, setCashReceived] = useState<number>(0);

  const [toasts, setToasts] = useState<{ id: number; message: string; type: "success" | "error" | "info" }[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<any[]>([]);
  const [vatEnabled, setVatEnabled] = useState(true);

  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([
    { slug: "coffee", name: "Cà phê" },
    { slug: "tea", name: "Trà & Nước" },
    { slug: "pastry", name: "Bánh ngọt" },
    { slug: "dish", name: "Món ăn" }
  ]);

  const [availableToppings, setAvailableToppings] = useState<{ name: string; price: number }[]>([]);

  // Quick Add MenuItem state
  const [quickAddForm, setQuickAddForm] = useState({
    name: "",
    category: "coffee",
    price: "",
    description: "",
    image_url: "",
  });
  const [quickAddSaving, setQuickAddSaving] = useState(false);

  // Broadcast Channel for sync across tabs
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Double-click/Hold states for items
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [detailedMenuItem, setDetailedMenuItem] = useState<MenuItem | null>(null);

  // KDS sound chime
  const playKdsChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn("Web Audio chime failed", e);
    }
  };

  // Toast Helper
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Fetch initial data
  useEffect(() => {
    fetchCategories();
    fetchToppings();
    fetchSystemSettings();
    fetchMenu();
    fetchInventory();
    fetchTables();
    fetchOrders();
    fetchPayments();

    // Setup broadcast channel for realtime communication between tabs
    if (typeof window !== "undefined") {
      const channel = new BroadcastChannel("lambiance_pos_realtime");
      broadcastChannelRef.current = channel;
      channel.onmessage = (event) => {
        const { type, data } = event.data;
        if (type === "NEW_ORDER") {
          fetchOrders();
          playKdsChime();
          showToast(`Đơn hàng mới gửi bếp: ${data.orderCode}`, "info");
        } else if (type === "UPDATE_ORDER") {
          fetchOrders();
          showToast(`Đơn hàng ${data.orderCode} cập nhật trạng thái: ${data.status}`, "info");
        } else if (type === "REFRESH_TABLES") {
          fetchTables();
        }
      };

      // Load offline orders
      const stored = localStorage.getItem("lambiance_offline_orders");
      if (stored) {
        setOfflineOrders(JSON.parse(stored));
      }

      // Online status checks
      const handleOnline = () => {
        setIsOnline(true);
        showToast("Đã khôi phục kết nối mạng!", "success");
        syncOfflineOrders();
      };
      const handleOffline = () => {
        setIsOnline(false);
        showToast("Mất kết nối mạng! Hệ thống chuyển sang Offline Mode.", "error");
      };
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      setIsOnline(navigator.onLine);

      return () => {
        channel.close();
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Sync Offline orders to backend when online
  async function syncOfflineOrders() {
    const stored = localStorage.getItem("lambiance_offline_orders");
    if (!stored) return;
    const offlineList = JSON.parse(stored);
    if (offlineList.length === 0) return;

    setSyncing(true);
    showToast(`Đang đồng bộ ${offlineList.length} đơn hàng offline...`, "info");

    let successCount = 0;
    for (const ord of offlineList) {
      try {
        const res = await fetch("/api/pos/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ord),
        });
        if (res.ok) {
          successCount++;
        }
      } catch (err) {
        console.error("Failed to sync order offline", err);
      }
    }

    if (successCount > 0) {
      showToast(`Đồng bộ thành công ${successCount}/${offlineList.length} đơn hàng!`, "success");
      const remaining = offlineList.slice(successCount);
      setOfflineOrders(remaining);
      localStorage.setItem("lambiance_offline_orders", JSON.stringify(remaining));
      fetchOrders();
      fetchInventory();
    }
    setSyncing(false);
  }

  async function handleSaveQuickAdd() {
    setQuickAddSaving(true);
    try {
      let formattedPrice = quickAddForm.price.trim();
      if (!formattedPrice.endsWith("đ")) {
        const numericVal = formattedPrice.replace(/[^0-9]/g, "");
        if (numericVal) {
          const num = parseInt(numericVal, 10);
          formattedPrice = num.toLocaleString("vi-VN") + "đ";
        }
      }

      const payload = {
        ...quickAddForm,
        price: formattedPrice,
        image_url: quickAddForm.image_url.trim() || "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600&auto=format&fit=crop",
        show_on_website: false,
        show_on_pos: true,
        sort_order: 100,
      };

      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(`Đã thêm món "${quickAddForm.name}" thành công!`, "success");
        setQuickAddForm({
          name: "",
          category: "coffee",
          price: "",
          description: "",
          image_url: "",
        });
        setActiveModal(null);
        fetchMenu();
      } else {
        const errorData = await res.json();
        showToast(errorData.error || "Không thể thêm món ăn", "error");
      }
    } catch {
      showToast("Lỗi kết nối server khi thêm món", "error");
    } finally {
      setQuickAddSaving(false);
    }
  }

  // APIs
  async function fetchCategories() {
    try {
      const res = await fetch("/api/menu/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch {
      console.error("Failed to load categories in POS");
    }
  }

  async function fetchSystemSettings() {
    try {
      const res = await fetch("/api/settings/system");
      if (res.ok) {
        const data = await res.json();
        setVatEnabled(data.vat_enabled === "true");
      }
    } catch {
      console.warn("Could not load system settings in POS");
    }
  }

  async function fetchToppings() {
    try {
      const res = await fetch("/api/menu/toppings");
      if (res.ok) setAvailableToppings(await res.json());
    } catch {
      console.error("Failed to load toppings in POS");
    }
  }

  async function fetchMenu() {
    try {
      const res = await fetch("/api/menu?scope=pos");
      if (res.ok) setMenuItems(await res.json());
    } catch {
      showToast("Lỗi tải menu món ăn", "error");
    }
  }

  async function fetchInventory() {
    try {
      const res = await fetch("/api/pos/inventory");
      if (res.ok) {
        const data = await res.json();
        const map: Record<number, number> = {};
        data.forEach((item: any) => {
          map[item.menuItemId] = item.stockQuantity;
        });
        setInventory(map);
      }
    } catch {
      showToast("Lỗi tải kho hàng", "error");
    }
  }

  async function fetchTables() {
    try {
      const res = await fetch("/api/reservations/tables");
      if (res.ok) {
        const data = await res.json();
        // Set mock statuses for tables
        setTables(data.map((t: any) => ({
          ...t,
          status: t.status || (t.id % 3 === 0 ? "serving" : "empty")
        })));
      }
    } catch {
      showToast("Lỗi tải sơ đồ bàn", "error");
    }
  }

  async function fetchOrders() {
    try {
      const res = await fetch("/api/pos/orders");
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (res.ok) setOrders(await res.json());
    } catch {
      showToast("Lỗi tải danh sách đơn hàng", "error");
    }
  }

  async function fetchPayments() {
    try {
      const res = await fetch("/api/settings/payment");
      if (res.ok) setPaymentSettings(await res.json());
    } catch {
      console.warn("Could not load payment settings in POS");
    }
  }

  // Helpers
  const parsePrice = (priceStr: string) => {
    return parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
  };

  // Add Item to Cart
  const handleAddItemToCart = (item: MenuItem) => {

    // Check if item with default configuration is already in cart
    const existingDefaultItem = cart.find(
      c =>
        c.menuItemId === item.id &&
        c.size === "M" &&
        c.iceLevel === "100%" &&
        c.sugarLevel === "100%" &&
        c.temperature === "cold" &&
        c.toppings.length === 0 &&
        c.notes === ""
    );

    if (existingDefaultItem) {
      handleUpdateCartQty(existingDefaultItem.id, 1);
      showToast(`Đã tăng số lượng ${item.name}`, "success");
      return;
    }

    const priceNum = item.price_m || parsePrice(item.price);
    const cartLineId = `${item.id}-${Date.now()}`;
    const newCartItem: CartItem = {
      id: cartLineId,
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.image_url,
      price: priceNum,
      quantity: 1,
      size: "M",
      iceLevel: "100%",
      sugarLevel: "100%",
      temperature: "cold",
      toppings: [],
      notes: ""
    };

    setCart(prev => [...prev, newCartItem]);
    setSelectedCartItem(newCartItem);
    showToast(`Đã thêm ${item.name} vào giỏ hàng`, "success");
  };

  // Fast Double Click Add
  const handleItemDoubleClick = (item: MenuItem) => {
    // Already added on single click, add one more
    const existing = cart.find(c => c.menuItemId === item.id);
    if (existing) {
      handleUpdateCartQty(existing.id, 1);
    }
  };

  // Long press / Hold to show detail
  const handleItemPressStart = (item: MenuItem) => {
    holdTimeoutRef.current = setTimeout(() => {
      setDetailedMenuItem(item);
    }, 600);
  };

  const handleItemPressEnd = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
    }
  };

  const handleUpdateCartQty = (id: string, delta: number) => {
    const item = cart.find(c => c.id === id);
    if (!item) return;
    
    // Check inventory stock - Disabled

    setCart(prev =>
      prev.map(c => {
        if (c.id === id) {
          const newQty = Math.max(1, c.quantity + delta);
          return { ...c, quantity: newQty };
        }
        return c;
      })
    );
  };

  const handleRemoveCartItem = (id: string) => {
    setCart(prev => prev.filter(c => c.id !== id));
    if (selectedCartItem?.id === id) {
      setSelectedCartItem(null);
    }
  };

  const handleApplyVoucher = () => {
    if (voucherCode.toUpperCase() === "DEEPCONF") {
      setDiscountType("percentage");
      setDiscountValue(20);
      setDiscountReason("Voucher Khuyến mãi 20%");
      showToast("Áp dụng mã giảm giá 20% thành công!", "success");
    } else if (voucherCode.toUpperCase() === "CAFE50K") {
      setDiscountType("amount");
      setDiscountValue(50000);
      setDiscountReason("Voucher Giảm 50.000đ");
      showToast("Áp dụng mã giảm giá 50.000đ thành công!", "success");
    } else {
      showToast("Mã giảm giá không hợp lệ", "error");
    }
  };

  // Calculations
  const getSubtotal = () => {
    return cart.reduce((sum, item) => {
      if (item.voided) return sum;
      const toppingPrice = item.toppings.reduce((s, t) => s + t.price, 0);
      return sum + (item.price + toppingPrice) * item.quantity;
    }, 0);
  };

  const getDiscountAmount = (subtotal: number) => {
    if (discountType === "percentage") {
      return subtotal * (discountValue / 100);
    }
    if (discountType === "amount") {
      return discountValue;
    }
    return 0;
  };

  const getVatAmount = (subtotal: number, discount: number) => {
    if (!vatEnabled) return 0;
    return Math.max(0, subtotal - discount) * 0.1; // 10% VAT
  };

  const getTotal = () => {
    const sub = getSubtotal();
    const disc = getDiscountAmount(sub);
    const vat = getVatAmount(sub, disc);
    return Math.max(0, sub - disc + vat + surcharge);
  };

  // Submit Order flow
  async function handleSendToKitchen() {
    if (cart.length === 0) {
      showToast("Giỏ hàng đang trống", "error");
      return;
    }

    if (orderType === "dine_in" && !selectedTable) {
      showToast("Vui lòng chọn bàn ăn trước khi gửi bếp", "error");
      setActiveModal("tables");
      return;
    }

    const orderPayload = {
      tableId: orderType === "dine_in" ? selectedTable?.id : null,
      customerName: orderType === "delivery" ? customerName : (selectedTable ? `Bàn ${selectedTable.table_number}` : "Khách mang về"),
      customerPhone: orderType === "delivery" ? customerPhone : "",
      customerAddress: orderType === "delivery" ? customerAddress : "",
      orderType,
      deliveryPartner: orderType === "delivery" ? deliveryPartner : null,
      status: "sent_kitchen",
      notes: selectedTable ? `Gửi từ sơ đồ bàn ${selectedTable.table_number}` : "Đặt nhanh mang về",
      discountType,
      discountValue,
      discountReason,
      vatRate: vatEnabled ? 10.0 : 0.0,
      surcharge,
      subtotal: getSubtotal(),
      totalAmount: getTotal(),
      items: cart,
    };

    if (!isOnline) {
      // Offline mode saving
      const savedOffline = [...offlineOrders, orderPayload];
      setOfflineOrders(savedOffline);
      localStorage.setItem("lambiance_offline_orders", JSON.stringify(savedOffline));
      
      // Update local tables mock status
      if (selectedTable) {
        setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, status: "serving" } : t));
      }
      
      showToast("Đơn hàng đã được lưu offline vào máy!", "success");
      setCart([]);
      setSelectedTable(null);
      return;
    }

    try {
      const res = await fetch("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Đơn hàng đã được chuyển xuống bếp chế biến", "success");
        setCart([]);
        setSelectedTable(null);
        fetchOrders();
        fetchInventory();
        fetchTables();

        // Broadcast to other windows
        broadcastChannelRef.current?.postMessage({
          type: "NEW_ORDER",
          data: { orderCode: data.orderCode }
        });
      } else {
        showToast(data.error || "Gửi đơn hàng thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối khi gửi bếp", "error");
    }
  }

  // Update order status (KDS screen controls)
  async function handleUpdateOrderStatus(orderId: number, newStatus: string) {
    try {
      const res = await fetch(`/api/pos/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast("Đã cập nhật trạng thái đơn hàng", "success");
        fetchOrders();
        
        const updatedOrder = orders.find(o => o.id === orderId);
        broadcastChannelRef.current?.postMessage({
          type: "UPDATE_ORDER",
          data: { orderCode: updatedOrder?.orderCode || "", status: newStatus }
        });
      }
    } catch {
      showToast("Không thể kết nối đến máy chủ", "error");
    }
  }

  // Checkout & Pay
  const handleOpenCheckout = () => {
    if (cart.length === 0) {
      showToast("Vui lòng thêm sản phẩm để thanh toán", "error");
      return;
    }
    const total = getTotal();
    setPaymentMethods([{ method: "cash", amount: total }]);
    setCashReceived(total);
    setActiveModal("checkout");
  };

  async function handleProcessPayment() {
    // Save order first if it doesn't exist, or update paid status
    const orderPayload = {
      tableId: orderType === "dine_in" ? selectedTable?.id : null,
      customerName: orderType === "delivery" ? customerName : (selectedTable ? `Bàn ${selectedTable.table_number}` : "Khách mang đi"),
      customerPhone: orderType === "delivery" ? customerPhone : "",
      customerAddress: orderType === "delivery" ? customerAddress : "",
      orderType,
      deliveryPartner: orderType === "delivery" ? deliveryPartner : null,
      status: "paid",
      notes: "Thanh toán ngay tại quầy",
      discountType,
      discountValue,
      discountReason,
      vatRate: vatEnabled ? 10.0 : 0.0,
      surcharge,
      subtotal: getSubtotal(),
      totalAmount: getTotal(),
      items: cart,
    };

    try {
      // 1. Send / Create order
      const orderRes = await fetch("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        showToast("Lỗi khi tạo đơn thanh toán", "error");
        return;
      }

      // 2. Submit payment method details
      const payRes = await fetch(`/api/pos/orders/${orderData.orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethods }),
      });

      if (payRes.ok) {
        showToast("Đã xử lý thanh toán thành công!", "success");
        setCart([]);
        setSelectedTable(null);
        setActiveModal(null);
        fetchOrders();
        fetchTables();
        fetchInventory();
        
        broadcastChannelRef.current?.postMessage({
          type: "UPDATE_ORDER",
          data: { orderCode: orderData.orderCode, status: "paid" }
        });
      }
    } catch {
      showToast("Lỗi kết nối thanh toán", "error");
    }
  }

  // Voiding order items
  const handleOpenVoidItem = (orderId: number, itemId: string) => {
    setItemToVoid({ orderId, itemId });
    setVoidReason("");
    setVoidSupervisor("");
    setActiveModal("voidConfirm");
  };

  async function handleConfirmVoid() {
    if (!voidReason || !voidSupervisor) {
      showToast("Vui lòng điền lý do và người duyệt", "error");
      return;
    }
    if (!itemToVoid) return;

    try {
      const res = await fetch(`/api/pos/orders/${itemToVoid.orderId}/void-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: itemToVoid.itemId,
          reason: voidReason,
          approvedByUsername: voidSupervisor
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Đã hủy món thành công!", "success");
        setActiveModal(null);
        fetchOrders();
        fetchInventory();
      } else {
        showToast(data.error || "Hủy món thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối", "error");
    }
  }

  // Refund whole order
  async function handleRefundOrder(orderId: number, amount: number) {
    const reason = prompt("Lý do hoàn tiền hoá đơn này:");
    if (!reason) return;

    try {
      const res = await fetch(`/api/pos/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundAmount: amount, reason }),
      });
      if (res.ok) {
        showToast("Hoàn tiền thành công!", "success");
        fetchOrders();
      }
    } catch {
      showToast("Lỗi kết nối", "error");
    }
  }

  // Table selection handler
  const handleSelectTable = (table: Table) => {
    // If table is serving, try to load its draft/active order
    const tableOrder = orders.find(o => o.tableId === table.id && o.status !== "paid" && o.status !== "done" && o.status !== "cancelled");
    if (tableOrder) {
      // Load this order to cart
      setCart(tableOrder.items.map(i => ({ ...i, id: String(i.id) })));
      setDiscountType(tableOrder.discountType);
      setDiscountValue(tableOrder.discountValue);
      setDiscountReason(tableOrder.discountReason);
      setSurcharge(tableOrder.surcharge);
      setOrderType("dine_in");
      setSelectedTable(table);
      showToast(`Đã tải đơn của Bàn ${table.table_number}`, "info");
    } else {
      setSelectedTable(table);
      setCart([]);
      setOrderType("dine_in");
      showToast(`Mở bàn ${table.table_number}`, "success");
    }
    setActiveModal(null);
  };

  // Temp print invoice
  const handlePrintTempInvoice = (order: Order | null = null) => {
    // Create print overlay
    const itemsList = order ? order.items : cart;
    const code = order ? order.orderCode : "TEMP-ORD";
    const sub = order ? order.subtotal : getSubtotal();
    const disc = order ? getDiscountAmount(sub) : getDiscountAmount(sub);
    const vat = order ? getVatAmount(sub, disc) : getVatAmount(sub, disc);
    const sur = order ? order.surcharge : surcharge;
    const tot = order ? order.totalAmount : getTotal();

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <style>
            body { font-family: monospace; padding: 20px; width: 300px; color: #000; }
            .center { text-align: center; }
            .line { border-bottom: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; font-size: 12px; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <h3 class="center">L'AMBIANCE CAFÉ</h3>
          <p class="center">Thảo Điền, Quận 2, TP. HCM</p>
          <p class="center">PHIẾU TẠM TÍNH</p>
          <div class="line"></div>
          <p>Mã đơn: ${code}</p>
          <p>Thời gian: ${new Date().toLocaleString("vi-VN")}</p>
          <div class="line"></div>
          <table>
            <thead>
              <tr>
                <th>Món</th>
                <th>SL</th>
                <th class="right">T.Tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList.map(item => {
                const menuItem = menuItems.find(m => m.id === item.menuItemId);
                const isDrink = menuItem?.category !== "dish" && menuItem?.category !== "pastry";
                
                const toppingsStr = item.toppings && item.toppings.length > 0 
                  ? `+ Topping: ${item.toppings.map(t => `${t.name} (+${t.price.toLocaleString()}đ)`).join(", ")}`
                  : "";
                
                const optionsStr = isDrink 
                  ? `+ Đá: ${item.iceLevel || "100%"} • Đường: ${item.sugarLevel || "100%"} • ${item.temperature === "cold" ? "Lạnh" : "Nóng"}`
                  : "";
                  
                const noteStr = item.notes ? `* Ghi chú: ${item.notes}` : "";
                
                return `
                  <tr>
                    <td>
                      <div style="font-weight: bold;">${item.name} (${item.size})</div>
                      ${optionsStr ? `<div style="font-size: 10px; color: #555; padding-left: 8px;">${optionsStr}</div>` : ""}
                      ${toppingsStr ? `<div style="font-size: 10px; color: #555; padding-left: 8px;">${toppingsStr}</div>` : ""}
                      ${noteStr ? `<div style="font-size: 10px; color: #555; padding-left: 8px; font-style: italic;">${noteStr}</div>` : ""}
                    </td>
                    <td style="vertical-align: top;">${item.quantity}</td>
                    <td class="right" style="vertical-align: top;">${(item.price * item.quantity).toLocaleString()}đ</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
          <div class="line"></div>
          <table>
            <tr><td>Cộng món:</td><td class="right">${sub.toLocaleString()}đ</td></tr>
            <tr><td>Khuyến mãi:</td><td class="right">-${disc.toLocaleString()}đ</td></tr>
            <tr><td>VAT (10%):</td><td class="right">${vat.toLocaleString()}đ</td></tr>
            <tr><td>Phụ thu:</td><td class="right">${sur.toLocaleString()}đ</td></tr>
            <tr style="font-weight: bold;"><td>TỔNG CỘNG:</td><td class="right">${tot.toLocaleString()}đ</td></tr>
          </table>
          <div class="line"></div>
          <p class="center">Cảm ơn quý khách!</p>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#080809] text-stone-100 font-sans overflow-hidden">
      {/* 1. Header Bar */}
      <header className="h-16 border-b border-white/[0.06] bg-[#0E0E10]/95 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-stone-950 font-bold shrink-0 shadow-lg shadow-amber-500/10">
            <Coffee className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide text-white leading-tight">L'Ambiance POS</h1>
            <p className="text-[10px] text-stone-500 flex items-center gap-1.5 mt-0.5">
              <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              {isOnline ? "Mạng Online" : "Mạng Offline"} &bull; Quầy chính
            </p>
          </div>
        </div>

        {/* Action Toggle buttons */}
        <div className="flex items-center gap-2">
          {/* Sơ đồ bàn */}
          <button
            onClick={() => setActiveModal("tables")}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-xs font-semibold text-stone-300 hover:border-white/15 hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            <Utensils className="h-4 w-4 text-amber-400" />
            Sơ đồ bàn
            {selectedTable && (
              <span className="ml-1 rounded bg-amber-500/15 border border-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400 font-bold uppercase">
                Bàn {selectedTable.table_number}
              </span>
            )}
          </button>

          {/* KDS bếp */}
          <button
            onClick={() => setActiveModal("kds")}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-xs font-semibold text-stone-300 hover:border-white/15 hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            <Clock className="h-4 w-4 text-emerald-400" />
            Màn hình Bếp (KDS)
          </button>

          {/* Báo cáo */}
          {user?.role === "admin" && (
            <button
              onClick={() => setActiveModal("reports")}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-xs font-semibold text-stone-300 hover:border-white/15 hover:bg-white/[0.05] transition-all cursor-pointer"
            >
              <TrendingUp className="h-4 w-4 text-blue-400" />
              Báo cáo doanh thu
            </button>
          )}

          {/* Audit Logs */}
          {user?.role === "admin" && (
            <button
              onClick={() => setActiveModal("audits")}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-xs font-semibold text-stone-300 hover:border-white/15 hover:bg-white/[0.05] transition-all cursor-pointer"
            >
              <History className="h-4 w-4 text-violet-400" />
              Lịch sử Audit
            </button>
          )}

          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-stone-400 hover:text-white transition-all cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-amber-400" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Fake offline toggle */}
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              isOnline ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
            }`}
            title={isOnline ? "Giả lập Mất mạng" : "Giả lập Có mạng"}
          >
            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          </button>

          {/* Exit POS */}
          <button
            onClick={() => router.push("/admin")}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-4 py-2 text-xs font-semibold transition-all cursor-pointer"
          >
            Thoát POS
          </button>
        </div>
      </header>

      {/* 2. Main Work Area (Left: Menu, Right: Cart) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Menu Grid */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0A0A0C]">
          {/* Subheader: Categories + Search */}
          <div className="border-b border-white/[0.04] bg-[#0E0E10]/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            {/* Category tabs */}
            <div className="flex flex-wrap gap-1.5">
              {[{ slug: "all", name: "Tất cả" }, ...categories].map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => setActiveCategory(cat.slug)}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    activeCategory === cat.slug
                      ? "bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/15"
                      : "bg-white/5 text-stone-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500 pointer-events-none">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Tìm món, mã món..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-4 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/40 transition-all font-sans"
                />
              </div>

              {/* Quick Add Menu Item Button */}
              <button
                type="button"
                onClick={() => setActiveModal("quickAdd")}
                className="flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-2 text-xs font-bold text-stone-950 transition-colors shadow-lg shadow-amber-500/10 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm món</span>
              </button>
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {menuItems
                .filter(item => activeCategory === "all" || item.category === activeCategory)
                .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((item) => {
                  const isOutOfStock = false;

                  return (
                    <div
                      key={item.id}
                      onMouseDown={() => handleItemPressStart(item)}
                      onMouseUp={handleItemPressEnd}
                      onMouseLeave={handleItemPressEnd}
                      onTouchStart={() => handleItemPressStart(item)}
                      onTouchEnd={handleItemPressEnd}
                      onClick={() => !isOutOfStock && handleAddItemToCart(item)}
                      onDoubleClick={() => !isOutOfStock && handleItemDoubleClick(item)}
                      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 flex flex-col justify-between cursor-pointer select-none bg-[#111114] ${
                        isOutOfStock
                          ? "border-white/[0.03] opacity-50 cursor-not-allowed"
                          : "border-white/[0.06] hover:border-amber-500/30 hover:bg-[#15151A]"
                      }`}
                    >
                      {/* Image container */}
                      <div className="relative aspect-video w-full overflow-hidden bg-stone-900 shrink-0">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        {/* Status badging */}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="rounded bg-rose-500/90 border border-rose-400/20 px-2 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                              Hết món
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content details */}
                      <div className="p-4 flex-grow flex flex-col justify-between gap-1">
                        <h4 className="text-xs font-semibold text-stone-200 group-hover:text-white line-clamp-2 leading-snug">
                          {item.name}
                        </h4>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.03]">
                          <span className="text-xs font-bold text-amber-400">
                            {item.price}
                          </span>
                          {/* Stock label removed */}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right Side: Cart / Order Panel */}
        <div className="w-[380px] border-l border-white/[0.06] bg-[#0E0E10]/95 backdrop-blur-md flex flex-col shrink-0 overflow-hidden">
          {/* Order settings selectors */}
          <div className="p-4 border-b border-white/[0.04] space-y-3 shrink-0">
            {/* Mode selectors */}
            <div className="grid grid-cols-3 gap-1 bg-white/5 p-0.5 rounded-xl">
              {(["dine_in", "take_away", "delivery"] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`rounded-lg py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    orderType === type
                      ? "bg-amber-500 text-stone-950"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  {type === "dine_in" ? "Tại bàn" : type === "take_away" ? "Mang đi" : "Giao hàng"}
                </button>
              ))}
            </div>

            {/* Selected table or Delivery info view */}
            {orderType === "dine_in" && (
              <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <div className="flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-stone-300 font-medium">
                    {selectedTable ? `Bàn ${selectedTable.table_number}` : "Chưa chọn bàn ăn"}
                  </span>
                </div>
                <button
                  onClick={() => setActiveModal("tables")}
                  className="text-[10px] font-bold uppercase text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  {selectedTable ? "Đổi bàn" : "Chọn bàn"}
                </button>
              </div>
            )}

            {orderType === "delivery" && (
              <div className="space-y-2 p-1.5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                <input
                  type="text"
                  placeholder="Tên khách hàng"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg bg-white/5 border border-white/5 py-1.5 px-3 text-[11px] text-stone-300 focus:outline-none focus:border-amber-500/30"
                />
                <input
                  type="text"
                  placeholder="Số điện thoại"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-lg bg-white/5 border border-white/5 py-1.5 px-3 text-[11px] text-stone-300 focus:outline-none focus:border-amber-500/30"
                />
                <input
                  type="text"
                  placeholder="Địa chỉ giao hàng"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full rounded-lg bg-white/5 border border-white/5 py-1.5 px-3 text-[11px] text-stone-300 focus:outline-none focus:border-amber-500/30"
                />
                <div className="grid grid-cols-4 gap-1 pt-1.5">
                  {(["internal", "grab", "shopee", "befood"] as const).map(partner => (
                    <button
                      key={partner}
                      onClick={() => setDeliveryPartner(partner)}
                      className={`rounded py-1 text-[9px] font-bold uppercase cursor-pointer ${
                        deliveryPartner === partner
                          ? "bg-amber-500/25 border border-amber-500/40 text-amber-400"
                          : "bg-white/5 text-stone-500"
                      }`}
                    >
                      {partner}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cart list scroll area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 text-stone-600">
                <ShoppingCart className="h-12 w-12 opacity-10 mb-3" />
                <p className="text-xs font-semibold">Giỏ hàng trống</p>
                <p className="text-[10px] mt-1">Chọn sản phẩm bên trái để thêm</p>
              </div>
            ) : (
              cart.map((item) => {
                const isSelected = selectedCartItem?.id === item.id;
                const toppingsCost = item.toppings.reduce((sum, t) => sum + t.price, 0);
                const finalUnitPrice = item.price + toppingsCost;

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3.5 transition-all relative ${
                      isSelected
                        ? "bg-white/[0.05] border-amber-500/30"
                        : "bg-white/[0.02] border-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => setSelectedCartItem(isSelected ? null : item)}
                        className="flex-1 flex gap-2.5 text-left cursor-pointer"
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-10 w-10 rounded-lg object-cover bg-stone-900 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-stone-200 line-clamp-1">{item.name}</h4>
                          <p className="text-[10px] text-stone-500 mt-0.5">
                            {item.size} &bull; {item.temperature === "cold" ? "Lạnh" : "Nóng"} &bull; Đường: {item.sugarLevel} &bull; Đá: {item.iceLevel}
                          </p>
                          {item.toppings.length > 0 && (
                            <p className="text-[9px] text-amber-500/80 truncate mt-1">
                              +{item.toppings.map(t => t.name).join(", ")}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-[9px] italic text-stone-600 truncate mt-0.5">
                              * {item.notes}
                            </p>
                          )}
                        </div>
                      </button>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveCartItem(item.id)}
                        className="text-stone-600 hover:text-rose-400 p-0.5 rounded cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Qty & Price controls */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.03]">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleUpdateCartQty(item.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-stone-400 hover:text-white cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-stone-200">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateCartQty(item.id, 1)}
                          className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-stone-400 hover:text-white cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-xs font-bold text-white">
                        {(finalUnitPrice * item.quantity).toLocaleString()}đ
                      </span>
                    </div>

                    {/* Expand option customizer (Toppings, sugar, ice) */}
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3.5 pt-3.5 border-t border-white/[0.05] space-y-3"
                      >
                        {/* Custom price editor */}
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-stone-500 mb-1">Chỉnh sửa giá món (đ)</p>
                          <input
                            type="text"
                            value={item.price}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              const numPrice = val ? parseInt(val, 10) : 0;
                              handleUpdateCartItemOptions(item.id, "price", numPrice);
                            }}
                            className="w-full rounded-lg bg-white/5 border border-white/5 py-1.5 px-3 text-[10px] text-stone-200 focus:outline-none focus:border-amber-500/30 font-semibold font-mono"
                            placeholder="VD: 45000"
                          />
                        </div>

                        {/* Size selector */}
                        {(() => {
                          const menuItem = menuItems.find(m => m.id === item.menuItemId);
                          if (!menuItem) return null;
                          
                          const hasS = !!menuItem.price_s;
                          const hasL = !!menuItem.price_l;
                          
                          // If neither S nor L is available, hide size selector
                          if (!hasS && !hasL) return null;
                          
                          return (
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-wider text-stone-500 mb-1">Kích cỡ (Size)</p>
                              <div className="grid grid-cols-3 gap-1.5">
                                {([ "S", "M", "L" ] as const).map(sz => {
                                  const isAvailable = sz === "M" || (sz === "S" && hasS) || (sz === "L" && hasL);
                                  if (!isAvailable) return <div key={sz} />;
                                  
                                  const sizePrice = sz === "S" ? menuItem.price_s : sz === "L" ? menuItem.price_l : (menuItem.price_m || parsePrice(menuItem.price));
                                  
                                  return (
                                    <button
                                      type="button"
                                      key={sz}
                                      onClick={() => handleUpdateSize(item.id, sz)}
                                      className={`rounded-lg py-1.5 text-[10px] font-semibold cursor-pointer ${
                                        item.size === sz
                                          ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                                          : "bg-white/5 text-stone-400"
                                      }`}
                                    >
                                      Size {sz} ({sizePrice?.toLocaleString()}đ)
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Ice / Sugar levels */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-stone-500 mb-1">Mức đá (Ice)</p>
                            <select
                              value={item.iceLevel}
                              onChange={(e) => handleUpdateCartItemOptions(item.id, "iceLevel", e.target.value)}
                              className="w-full rounded-lg bg-white/5 border border-white/5 py-1 px-2 text-[10px] text-stone-300 focus:outline-none"
                            >
                              <option value="100%">100% Đá</option>
                              <option value="70%">70% Đá</option>
                              <option value="50%">50% Đá</option>
                              <option value="30%">30% Đá</option>
                              <option value="0%">Không Đá</option>
                            </select>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-stone-500 mb-1">Mức đường (Sugar)</p>
                            <select
                              value={item.sugarLevel}
                              onChange={(e) => handleUpdateCartItemOptions(item.id, "sugarLevel", e.target.value)}
                              className="w-full rounded-lg bg-white/5 border border-white/5 py-1 px-2 text-[10px] text-stone-300 focus:outline-none"
                            >
                              <option value="100%">100% Đường</option>
                              <option value="70%">70% Đường</option>
                              <option value="50%">50% Đường</option>
                              <option value="30%">30% Đường</option>
                              <option value="0%">Không Đường</option>
                            </select>
                          </div>
                        </div>

                        {/* Hot / Cold selector */}
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-stone-500 mb-1">Nhiệt độ</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(["cold", "hot"] as const).map(temp => (
                              <button
                                key={temp}
                                onClick={() => handleUpdateCartItemOptions(item.id, "temperature", temp)}
                                className={`rounded-lg py-1 text-[10px] font-semibold cursor-pointer ${
                                  item.temperature === temp
                                    ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                                    : "bg-white/5 text-stone-400"
                                }`}
                              >
                                {temp === "cold" ? "Lạnh" : "Nóng"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Toppings Multi select */}
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-stone-500 mb-1">Toppings thêm</p>
                          <div className="flex flex-wrap gap-1">
                            {availableToppings.map(topping => {
                              const isAdded = item.toppings.some(t => t.name === topping.name);
                              return (
                                <button
                                  type="button"
                                  key={topping.name}
                                  onClick={() => handleToggleTopping(item.id, topping)}
                                  className={`rounded-lg px-2.5 py-1 text-[9px] font-semibold cursor-pointer ${
                                    isAdded
                                      ? "bg-amber-500/30 border border-amber-500/40 text-amber-400"
                                      : "bg-white/5 text-stone-500"
                                  }`}
                                >
                                  {topping.name} (+{topping.price.toLocaleString()}đ)
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-stone-500 mb-1">Ghi chú pha chế</p>
                          <input
                            type="text"
                            placeholder="VD: Không lấy bọt sữa, thêm thìa..."
                            value={item.notes}
                            onChange={(e) => handleUpdateCartItemOptions(item.id, "notes", e.target.value)}
                            className="w-full rounded-lg bg-white/5 border border-white/5 py-1 px-3 text-[10px] text-stone-300 focus:outline-none focus:border-amber-500/30"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pricing calculations footer */}
          <div className="border-t border-white/[0.06] bg-[#0E0E10]/95 p-4 space-y-4 shrink-0">
            {/* Voucher apply input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Mã voucher (DEEPCONF, CAFE50K)"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 px-3 text-xs text-stone-200 focus:outline-none focus:border-amber-500/30"
              />
              <button
                onClick={handleApplyVoucher}
                className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 text-xs font-bold text-amber-400 cursor-pointer"
              >
                Áp dụng
              </button>
            </div>

            {/* Calculations summaries */}
            <div className="space-y-1.5 text-xs text-stone-400">
              <div className="flex items-center justify-between">
                <span>Cộng món:</span>
                <span className="font-semibold text-white">{getSubtotal().toLocaleString()}đ</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Khuyến mãi {discountReason ? `(${discountReason})` : ""}:</span>
                <span className="font-semibold text-emerald-400">-{getDiscountAmount(getSubtotal()).toLocaleString()}đ</span>
              </div>
              {vatEnabled && (
                <div className="flex items-center justify-between py-0.5">
                  <span>Thuế VAT (10%):</span>
                  <span className="font-semibold text-white">{getVatAmount(getSubtotal(), getDiscountAmount(getSubtotal())).toLocaleString()}đ</span>
                </div>
              )}
              {surcharge > 0 && (
                <div className="flex items-center justify-between">
                  <span>Phụ thu / Phí ship:</span>
                  <span className="font-semibold text-white">{surcharge.toLocaleString()}đ</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-white/[0.04] pt-2.5 text-sm font-bold text-white">
                <span>TỔNG THÀNH TIỀN:</span>
                <span className="text-amber-400 text-base">{getTotal().toLocaleString()}đ</span>
              </div>
            </div>

            {/* Main Action triggers */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handlePrintTempInvoice(null)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 text-xs font-semibold text-stone-300 hover:bg-white/[0.06] cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                In tạm tính
              </button>
              <button
                onClick={handleSendToKitchen}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 py-3 text-xs font-bold text-amber-400 hover:bg-amber-500/15 cursor-pointer"
              >
                <Play className="h-4 w-4" />
                Gửi xuống bếp
              </button>
              <button
                onClick={handleOpenCheckout}
                className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 py-3.5 text-xs font-bold text-stone-950 shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                <ShoppingCart className="h-4 w-4" />
                Thanh toán hoá đơn
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MODALS PANEL POPUPS */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0E0E10] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[85vh] flex flex-col"
            >
              {/* Modal header */}
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  {activeModal === "tables" && "Sơ đồ bàn ăn (Table Map)"}
                  {activeModal === "kds" && "Màn hình chế biến KDS (Kitchen)"}
                  {activeModal === "checkout" && "Xác nhận thanh toán hoá đơn"}
                  {activeModal === "reports" && "Báo cáo doanh số POS"}
                  {activeModal === "audits" && "Nhật ký hệ thống (Audit Logs)"}
                  {activeModal === "voidConfirm" && "Yêu cầu huỷ món - Cần duyệt"}
                  {activeModal === "quickAdd" && "Thêm món mới vào thực đơn"}
                </h3>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1 rounded-lg hover:bg-white/5 text-stone-500 hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal content scrolls */}
              <div className="flex-1 overflow-y-auto p-6">
                
                {/* 3.1 TABLE MAP */}
                {activeModal === "tables" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
                      {/* Take away virtual table */}
                      <button
                        onClick={() => {
                          setOrderType("take_away");
                          setSelectedTable(null);
                          setActiveModal(null);
                        }}
                        className="border border-white/5 bg-white/2 hover:border-amber-500/30 rounded-xl p-4 flex flex-col justify-between text-left h-28 cursor-pointer"
                      >
                        <h4 className="font-bold text-white text-sm">MANG VỀ</h4>
                        <span className="text-[10px] text-stone-500 uppercase font-semibold">Khách mang đi</span>
                      </button>

                      {tables.map(table => {
                        const statusColors = {
                          empty: "border-emerald-500/20 bg-emerald-500/[0.02] text-emerald-400",
                          serving: "border-amber-500/20 bg-amber-500/[0.02] text-amber-400",
                          booked: "border-blue-500/20 bg-blue-500/[0.02] text-blue-400",
                          paying: "border-violet-500/20 bg-violet-500/[0.02] text-violet-400",
                          cleaning: "border-stone-500/20 bg-stone-500/[0.02] text-stone-500"
                        };

                        return (
                          <button
                            key={table.id}
                            onClick={() => handleSelectTable(table)}
                            className={`border rounded-xl p-4 flex flex-col justify-between text-left h-28 cursor-pointer transition-all hover:border-amber-500/30 ${statusColors[table.status || "empty"]}`}
                          >
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-white text-base">Bàn {table.table_number}</h4>
                              <span className="text-[9px] rounded bg-white/5 border border-white/10 px-1 py-0.5 text-stone-400">
                                {table.capacity} chỗ
                              </span>
                            </div>
                            <span className="text-[9px] uppercase tracking-wider font-bold">
                              {table.status === "empty" && "● Trống"}
                              {table.status === "serving" && "● Phục vụ"}
                              {table.status === "booked" && "● Đã đặt"}
                              {table.status === "paying" && "● Thanh toán"}
                              {table.status === "cleaning" && "● Chờ dọn"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3.2 KITCHEN DISPLAY SYSTEM */}
                {activeModal === "kds" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[60vh] overflow-hidden">
                      
                      {/* Column 1: Món mới */}
                      <div className="flex flex-col border border-white/[0.05] rounded-xl overflow-hidden bg-white/[0.01]">
                        <div className="bg-amber-500/10 border-b border-white/[0.05] p-3 text-xs font-bold text-amber-400 uppercase tracking-wider flex justify-between">
                          <span>Món mới gửi bếp</span>
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] text-amber-400">
                            {orders.filter(o => o.status === "sent_kitchen").length}
                          </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                          {orders.filter(o => o.status === "sent_kitchen").map(order => (
                            <div key={order.id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3.5 space-y-3">
                              <div className="flex justify-between items-start">
                                <h4 className="font-bold text-xs text-white">{order.orderCode}</h4>
                                <span className="text-[10px] text-amber-400 font-bold">{order.tableNumber ? `Bàn ${order.tableNumber}` : "Mang đi"}</span>
                              </div>
                              <ul className="text-xs text-stone-400 space-y-1.5 list-disc pl-4">
                                {order.items.map(item => (
                                  <li key={item.id}>
                                    <span className="font-semibold text-stone-200">{item.quantity}x {item.name}</span> ({item.size})
                                    {item.notes && <p className="text-[10px] text-stone-500 italic mt-0.5">* {item.notes}</p>}
                                  </li>
                                ))}
                              </ul>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, "preparing")}
                                className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 py-1.5 text-[10px] font-bold text-stone-950 cursor-pointer"
                              >
                                Nhận chế biến
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Column 2: Đang chế biến */}
                      <div className="flex flex-col border border-white/[0.05] rounded-xl overflow-hidden bg-white/[0.01]">
                        <div className="bg-blue-500/10 border-b border-white/[0.05] p-3 text-xs font-bold text-blue-400 uppercase tracking-wider flex justify-between">
                          <span>Đang thực hiện</span>
                          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] text-blue-400">
                            {orders.filter(o => o.status === "preparing").length}
                          </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                          {orders.filter(o => o.status === "preparing").map(order => (
                            <div key={order.id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3.5 space-y-3">
                              <div className="flex justify-between items-start">
                                <h4 className="font-bold text-xs text-white">{order.orderCode}</h4>
                                <span className="text-[10px] text-blue-400 font-bold">{order.tableNumber ? `Bàn ${order.tableNumber}` : "Mang đi"}</span>
                              </div>
                              <ul className="text-xs text-stone-400 space-y-1.5 list-disc pl-4">
                                {order.items.map(item => (
                                  <li key={item.id}>
                                    <span className="font-semibold text-stone-200">{item.quantity}x {item.name}</span>
                                    {item.notes && <p className="text-[10px] text-stone-500 italic mt-0.5">* {item.notes}</p>}
                                  </li>
                                ))}
                              </ul>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, "completed")}
                                className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 py-1.5 text-[10px] font-bold text-stone-950 cursor-pointer"
                              >
                                Hoàn thành món
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Column 3: Món hoàn thành */}
                      <div className="flex flex-col border border-white/[0.05] rounded-xl overflow-hidden bg-white/[0.01]">
                        <div className="bg-emerald-500/10 border-b border-white/[0.05] p-3 text-xs font-bold text-emerald-400 uppercase tracking-wider flex justify-between">
                          <span>Chờ phục vụ</span>
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] text-emerald-400">
                            {orders.filter(o => o.status === "completed").length}
                          </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                          {orders.filter(o => o.status === "completed").map(order => (
                            <div key={order.id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3.5 space-y-3">
                              <div className="flex justify-between items-start">
                                <h4 className="font-bold text-xs text-white">{order.orderCode}</h4>
                                <span className="text-[10px] text-emerald-400 font-bold">{order.tableNumber ? `Bàn ${order.tableNumber}` : "Mang đi"}</span>
                              </div>
                              <ul className="text-xs text-stone-400 space-y-1.5 list-disc pl-4">
                                {order.items.map(item => (
                                  <li key={item.id}>
                                    <span className="font-semibold text-stone-200">{item.quantity}x {item.name}</span>
                                  </li>
                                ))}
                              </ul>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, "served")}
                                className="w-full rounded-lg bg-stone-800 hover:bg-stone-700 py-1.5 text-[10px] font-bold text-stone-200 cursor-pointer border border-white/5"
                              >
                                Báo đã bưng ra
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* 3.3 CONFIRM CHECKOUT */}
                {activeModal === "checkout" && (
                  <div className="space-y-6 max-w-xl mx-auto">
                    <div className="space-y-4">
                      {/* Total bill Info */}
                      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-center">
                        <p className="text-xs text-stone-500 uppercase tracking-widest font-semibold mb-1">Cần thanh toán</p>
                        <h2 className="text-3xl font-bold text-amber-400">{getTotal().toLocaleString()}đ</h2>
                      </div>

                      {/* Payment method split */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Hình thức thanh toán</label>
                        <div className="grid grid-cols-5 gap-2">
                          {(["cash", "qr", "transfer", "pos", "wallet"] as const).map(method => (
                            <button
                              key={method}
                              onClick={() => {
                                setPaymentMethods([{ method, amount: getTotal() }]);
                              }}
                              className={`rounded-xl border py-3 text-xs font-bold uppercase transition-all cursor-pointer ${
                                paymentMethods[0]?.method === method
                                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                  : "border-white/[0.06] bg-white/[0.02] text-stone-500 hover:border-white/10 hover:text-stone-300"
                              }`}
                            >
                              {method === "cash" && "Tiền mặt"}
                              {method === "qr" && "QR quét"}
                              {method === "transfer" && "C.Khoản"}
                              {method === "pos" && "Thẻ POS"}
                              {method === "wallet" && "Ví điện tử"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Multi payment split helper */}
                      {paymentMethods[0]?.method === "cash" && (
                        <div className="space-y-4 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                          <div className="space-y-1.5">
                            <label className="text-xs text-stone-400">Tiền khách đưa:</label>
                            <input
                              type="number"
                              value={cashReceived || ""}
                              onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 px-4 font-mono text-base text-stone-200 focus:outline-none focus:border-amber-500/30"
                              placeholder="Nhập số tiền..."
                            />
                          </div>

                          {/* Quick Cash Suggestions */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">Chọn nhanh tiền mặt:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {getCashSuggestions(getTotal()).map(amount => (
                                <button
                                  type="button"
                                  key={amount}
                                  onClick={() => setCashReceived(amount)}
                                  className={`rounded-lg py-1.5 px-3 text-[10px] font-mono font-semibold transition-all border cursor-pointer ${
                                    cashReceived === amount
                                      ? "bg-amber-500/20 border-amber-500/40 text-amber-400 font-bold"
                                      : "bg-white/5 border-white/[0.05] text-stone-300 hover:bg-white/10 hover:border-white/10"
                                  }`}
                                >
                                  {amount.toLocaleString()}đ
                                  {amount === getTotal() && " (Đủ)"}
                                  {amount - getTotal() === 10000 && " (+10k)"}
                                  {amount - getTotal() === 20000 && " (+20k)"}
                                  {amount - getTotal() === 50000 && " (+50k)"}
                                </button>
                              ))}
                            </div>
                          </div>

                          {cashReceived - getTotal() > 0 && (
                            <div className="flex justify-between text-xs text-emerald-400 font-bold border-t border-white/[0.04] pt-2.5">
                              <span>Trả lại khách:</span>
                              <span>{(cashReceived - getTotal()).toLocaleString()}đ</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* VietQR Bank Transfer Info */}
                      {paymentMethods[0]?.method === "transfer" && (() => {
                        const vietqr = paymentSettings.find(p => p.provider === "vietqr");
                        if (!vietqr || !vietqr.enabled) {
                          return (
                            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl text-center text-xs text-stone-500">
                              Chưa cấu hình thông tin chuyển khoản VietQR trong Cài đặt.
                            </div>
                          );
                        }
                        const addInfo = selectedOrder ? selectedOrder.orderCode : `POS-${Date.now().toString().slice(-6)}`;
                        const qrUrl = `https://img.vietqr.io/image/${vietqr.bank_name}-${vietqr.account_number}-compact.png?amount=${getTotal()}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(vietqr.account_holder)}`;
                        return (
                          <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl space-y-4 flex flex-col items-center">
                            <div className="bg-white p-2 rounded-xl">
                              <img src={qrUrl} alt="VietQR Code" className="h-44 w-44 object-contain" />
                            </div>
                            <div className="w-full text-xs space-y-1.5 text-stone-300">
                              <div className="flex justify-between">
                                <span className="text-stone-500">Ngân hàng:</span>
                                <span className="font-bold text-white">{vietqr.bank_name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-stone-500">Số tài khoản:</span>
                                <span className="font-mono font-bold text-amber-400">{vietqr.account_number}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-stone-500">Chủ tài khoản:</span>
                                <span className="font-bold text-white">{vietqr.account_holder}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-stone-500">Số tiền:</span>
                                <span className="font-bold text-emerald-400">{getTotal().toLocaleString()}đ</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-stone-500">Nội dung CK:</span>
                                <span className="font-mono font-bold text-amber-400">{addInfo}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* MoMo QR Info */}
                      {paymentMethods[0]?.method === "wallet" && (() => {
                        const momo = paymentSettings.find(p => p.provider === "momo");
                        if (!momo || !momo.enabled) {
                          return (
                            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl text-center text-xs text-stone-500">
                              Chưa cấu hình Ví MoMo trong Cài đặt.
                            </div>
                          );
                        }
                        const addInfo = selectedOrder ? selectedOrder.orderCode : `POS-${Date.now().toString().slice(-6)}`;
                        const momoQrData = `2key=phone:${momo.phone_number}&amount=${getTotal()}&note=${addInfo}`;
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(momoQrData)}`;
                        return (
                          <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl space-y-4 flex flex-col items-center">
                            <div className="bg-white p-2 rounded-xl">
                              <img src={qrUrl} alt="MoMo QR Code" className="h-44 w-44 object-contain" />
                            </div>
                            <div className="w-full text-xs space-y-1.5 text-stone-300">
                              <div className="flex justify-between">
                                <span className="text-stone-500">Kênh thanh toán:</span>
                                <span className="font-bold text-pink-400">Ví Điện Tử MoMo</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-stone-500">Số điện thoại:</span>
                                <span className="font-mono font-bold text-white">{momo.phone_number}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-stone-500">Người nhận:</span>
                                <span className="font-bold text-white">{momo.account_holder}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-stone-500">Số tiền:</span>
                                <span className="font-bold text-emerald-400">{getTotal().toLocaleString()}đ</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-stone-500">Lời nhắn:</span>
                                <span className="font-mono font-bold text-amber-400">{addInfo}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* VNPay / ZaloPay Gateway Info */}
                      {paymentMethods[0]?.method === "qr" && (() => {
                        const vnpay = paymentSettings.find(p => p.provider === "vnpay");
                        const zalopay = paymentSettings.find(p => p.provider === "zalopay");
                        const activeGateway = vnpay?.enabled ? "VNPay QR" : zalopay?.enabled ? "ZaloPay QR" : null;

                        if (!activeGateway) {
                          return (
                            <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl text-center text-xs text-stone-500">
                              Chưa bật Cổng VNPay hoặc ZaloPay Merchant trong Cài đặt.
                            </div>
                          );
                        }
                        const addInfo = selectedOrder ? selectedOrder.orderCode : `POS-${Date.now().toString().slice(-6)}`;
                        const simQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://demoweb-gateway.vn/pay?merchant=${activeGateway === "VNPay QR" ? vnpay.merchant_id : zalopay.merchant_id}&amount=${getTotal()}&order=${addInfo}`)}`;
                        return (
                          <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl space-y-4 flex flex-col items-center">
                            <div className="bg-white p-2 rounded-xl">
                              <img src={simQrUrl} alt="Gateway QR Code" className="h-44 w-44 object-contain" />
                            </div>
                            <div className="w-full text-xs space-y-1.5 text-stone-300">
                              <div className="flex justify-between">
                                <span className="text-stone-500">Cổng liên kết:</span>
                                <span className={`font-bold ${activeGateway === "VNPay QR" ? "text-red-400" : "text-blue-400"}`}>{activeGateway}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-stone-500">Mã Merchant ID:</span>
                                <span className="font-mono font-bold text-white">{activeGateway === "VNPay QR" ? vnpay.merchant_id : zalopay.merchant_id}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-stone-500">Mã đơn hàng:</span>
                                <span className="font-mono font-bold text-amber-400">{addInfo}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-stone-500">Trạng thái cổng:</span>
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                                  Chờ quét mã...
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <button
                        onClick={handleProcessPayment}
                        className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-3.5 text-xs font-bold text-stone-950 shadow-lg shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Check className="h-4 w-4" />
                        Xác nhận Thanh toán & Xuất hoá đơn
                      </button>
                    </div>
                  </div>
                )}

                {/* 3.4 SALES REPORTS */}
                {activeModal === "reports" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Summary sales */}
                      <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-5 space-y-4">
                        <h4 className="font-bold text-xs text-stone-400 uppercase tracking-wide">Doanh số ca hiện tại</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-white/5 rounded-lg text-center">
                            <p className="text-[10px] text-stone-500">Doanh thu mặt</p>
                            <p className="text-lg font-bold text-white mt-1">12.450.000đ</p>
                          </div>
                          <div className="p-3 bg-white/5 rounded-lg text-center">
                            <p className="text-[10px] text-stone-500">Đơn đã phục vụ</p>
                            <p className="text-lg font-bold text-white mt-1">45 đơn</p>
                          </div>
                        </div>
                      </div>

                      {/* Best Sellers */}
                      <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-5">
                        <h4 className="font-bold text-xs text-stone-400 uppercase tracking-wide mb-3">Món bán chạy nhất</h4>
                        <div className="space-y-2">
                          {[
                            { name: "Egg Coffee", count: 24 },
                            { name: "Cold Brew Tonic", count: 18 },
                            { name: "Croissant Bơ Pháp", count: 15 },
                          ].map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-xs p-2 bg-white/5 rounded-lg">
                              <span className="text-stone-300 font-medium">{item.name}</span>
                              <span className="font-bold text-amber-400">{item.count} ly</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3.5 AUDIT LOGS */}
                {activeModal === "audits" && (
                  <div className="space-y-6">
                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-white/5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          <tr>
                            <th className="p-3">Thời gian</th>
                            <th className="p-3">Tài khoản</th>
                            <th className="p-3">Hành động</th>
                            <th className="p-3">Chi tiết</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {[
                            { time: "10:35 - 27/06", user: "admin", action: "HUỶ MÓN", detail: "Huỷ 1 ly Espresso do khách đổi ý" },
                            { time: "10:20 - 27/06", user: "staff", action: "TẠO ĐƠN", detail: "Tạo đơn ORD-17253242 tại Bàn T5" },
                            { time: "09:45 - 27/06", user: "admin", action: "HOÀN TIỀN", detail: "Hoàn tiền 69.000đ cho khách do pha chế sai công thức" },
                          ].map((log, i) => (
                            <tr key={i} className="hover:bg-white/[0.02]">
                              <td className="p-3 font-mono text-[10px] text-stone-500">{log.time}</td>
                              <td className="p-3 font-bold text-white">{log.user}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  log.action === "HUỶ MÓN" ? "bg-rose-500/10 text-rose-400" :
                                  log.action === "HOÀN TIỀN" ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"
                                }`}>
                                  {log.action}
                                </span>
                              </td>
                              <td className="p-3 text-stone-400">{log.detail}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3.6 VOID CONFRIM */}
                {activeModal === "voidConfirm" && (
                  <div className="space-y-4 max-w-sm mx-auto">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs text-stone-400 font-semibold">Tên tài khoản duyệt hủy món:</label>
                        <input
                          type="text"
                          placeholder="admin"
                          value={voidSupervisor}
                          onChange={(e) => setVoidSupervisor(e.target.value)}
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 px-3 text-xs text-stone-200 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-stone-400 font-semibold">Lý do hủy món:</label>
                        <input
                          type="text"
                          placeholder="Khách đổi ý / Pha chế lỗi..."
                          value={voidReason}
                          onChange={(e) => setVoidReason(e.target.value)}
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 px-3 text-xs text-stone-200 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={handleConfirmVoid}
                        className="w-full rounded-xl bg-rose-500 hover:bg-rose-600 py-3 text-xs font-bold text-white cursor-pointer"
                      >
                        Xác nhận Huỷ món
                      </button>
                    </div>
                  </div>
                )}

                {/* 3.7 QUICK ADD MENU ITEM */}
                {activeModal === "quickAdd" && (
                  <div className="space-y-4 max-w-md mx-auto py-2">
                    <div>
                      <label className="block text-xs font-semibold text-white/60 mb-1.5">
                        Tên món *
                      </label>
                      <input
                        type="text"
                        value={quickAddForm.name}
                        onChange={(e) => setQuickAddForm({ ...quickAddForm, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
                        placeholder="VD: Cà phê dừa sữa"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-white/60 mb-1.5">
                          Danh mục *
                        </label>
                        <select
                          value={quickAddForm.category}
                          onChange={(e) => setQuickAddForm({ ...quickAddForm, category: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/50"
                        >
                          {categories.map((cat) => (
                            <option key={cat.slug} value={cat.slug} className="bg-stone-900 text-white">
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-white/60 mb-1.5">
                          Giá bán *
                        </label>
                        <input
                          type="text"
                          value={quickAddForm.price}
                          onChange={(e) => setQuickAddForm({ ...quickAddForm, price: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
                          placeholder="VD: 45.000đ"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/60 mb-1.5">
                        Mô tả món
                      </label>
                      <textarea
                        value={quickAddForm.description}
                        onChange={(e) => setQuickAddForm({ ...quickAddForm, description: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50 resize-none"
                        placeholder="Thêm mô tả ngắn..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/60 mb-1.5">
                        URL hình ảnh
                      </label>
                      <input
                        type="text"
                        value={quickAddForm.image_url}
                        onChange={(e) => setQuickAddForm({ ...quickAddForm, image_url: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50"
                        placeholder="https://... (Nếu có)"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveQuickAdd}
                        disabled={quickAddSaving || !quickAddForm.name || !quickAddForm.price}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 text-sm font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        {quickAddSaving && <Loader2 className="w-4 h-4 animate-spin text-stone-950" />}
                        <span>Thêm & Bán</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. DETAILS POPUP MODAL (Hold to view description) */}
      <AnimatePresence>
        {detailedMenuItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0E0E10] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-w-sm w-full p-6 text-center space-y-4"
            >
              <img
                src={detailedMenuItem.image_url}
                alt={detailedMenuItem.name}
                className="h-44 w-full object-cover rounded-xl bg-stone-900"
              />
              <h3 className="text-base font-bold text-white">{detailedMenuItem.name}</h3>
              <p className="text-xs text-stone-400 leading-relaxed">{detailedMenuItem.description}</p>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-bold text-amber-400">{detailedMenuItem.price}</span>
                <button
                  onClick={() => {
                    handleAddItemToCart(detailedMenuItem);
                    setDetailedMenuItem(null);
                  }}
                  className="rounded-xl bg-amber-500 text-stone-950 px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  Thêm vào giỏ
                </button>
              </div>
              <button
                onClick={() => setDetailedMenuItem(null)}
                className="w-full py-2.5 rounded-xl border border-white/5 text-stone-500 hover:text-stone-300 text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. FLOATING TOASTS LIST */}
      <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-3 max-w-xs w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className={`rounded-xl border p-4 text-xs font-semibold pointer-events-auto shadow-xl ${
                t.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                t.type === "error" ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"
              }`}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );

  // Cart item customizer updater helper
  function handleUpdateCartItemOptions(id: string, field: keyof CartItem, value: any) {
    setCart(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  function handleUpdateSize(cartItemId: string, sz: "S" | "M" | "L") {
    setCart(prev =>
      prev.map(c => {
        if (c.id === cartItemId) {
          const menuItem = menuItems.find(m => m.id === c.menuItemId);
          if (!menuItem) return { ...c, size: sz };
          
          let newPrice = c.price;
          if (sz === "S" && menuItem.price_s) newPrice = menuItem.price_s;
          else if (sz === "M") newPrice = menuItem.price_m || parsePrice(menuItem.price);
          else if (sz === "L" && menuItem.price_l) newPrice = menuItem.price_l;
          
          return { ...c, size: sz, price: newPrice };
        }
        return c;
      })
    );
  }

  // Toppings toggler helper
  function handleToggleTopping(id: string, topping: CartTopping) {
    setCart(prev =>
      prev.map(c => {
        if (c.id === id) {
          const isAdded = c.toppings.some(t => t.name === topping.name);
          const newToppings = isAdded
            ? c.toppings.filter(t => t.name !== topping.name)
            : [...c.toppings, topping];
          return { ...c, toppings: newToppings };
        }
        return c;
      })
    );
  }
}
