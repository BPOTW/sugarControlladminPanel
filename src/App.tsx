import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { 
  Search, 
  Filter, 
  Download, 
  Package, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  XCircle,
  RefreshCw,
  Truck,
  Copy,
  Check,
  DollarSign,
  TrendingDown,
  Activity,
  Eye,
  Users
} from "lucide-react";

type Order = {
  _id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
  shippingFee: number;
  total: number;
  orderDate: string;
  orderStatus: string;
  trackingId: string;
  progress: number;
  notes: string;
};

type Stats = {
  liveViews: number;
  totalViews: number;
  uniqueVisitors: number;
  total: number;
  pending: number;
  confirmed: number;
  delivered: number;
  totalSales: number;
  returns: number;
  losses: number;
  profit: number;
  lastUpdated: string;
};

const OrdersDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tempOrders, setTempOrders] = useState<Record<string, Partial<Order>>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    liveViews: 0,
    totalViews: 0,
    uniqueVisitors: 0,
    total: 0,
    pending: 0,
    confirmed: 0,
    delivered: 0,
    totalSales: 0,
    returns: 0,
    losses: 0,
    profit: 0,
    lastUpdated: new Date().toISOString(),
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize Socket.IO connection
    const socket = io("https://sugarcontrollerbackend-production.up.railway.app", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    // Listen for real-time order updates
    socket.on("orderUpdated", (updatedOrder: Order) => {
      setOrders((prev) =>
        prev.map((order) => (order._id === updatedOrder._id ? updatedOrder : order))
      );
    });

    // Listen for new orders
    socket.on("newOrder", (newOrder: Order) => {
      setOrders((prev) => [newOrder, ...prev]);
    });

    // Listen for stats updates
    socket.on("statsUpdated", (updatedStats: Stats) => {
      setStats(updatedStats);
    });

    // Listen for live views updates
    socket.on("liveViewsUpdated", ({ liveViews, uniqueVisitors }: { liveViews: number; uniqueVisitors: number }) => {
      setStats((prev) => ({
        ...prev,
        liveViews,
        uniqueVisitors
      }));
    });

    // Initial data fetch
    const fetchInitialData = async () => {
      try {
        const [ordersRes, statsRes] = await Promise.all([
          axios.get<Order[]>("https://sugarcontrollerbackend-production.up.railway.app/orders"),
          axios.get<Stats>("https://sugarcontrollerbackend-production.up.railway.app/stats"),
        ]);
        setOrders(ordersRes.data);
        setStats(statsRes.data);
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Track page view when dashboard loads
    const trackView = async () => {
      try {
        await axios.post("https://sugarcontrollerbackend-production.up.railway.app/track-view");
      } catch (err) {
        console.error("Failed to track view:", err);
      }
    };
    trackView();

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const [ordersRes, statsRes] = await Promise.all([
        axios.get<Order[]>("https://sugarcontrollerbackend-production.up.railway.app/orders"),
        axios.get<Stats>("https://sugarcontrollerbackend-production.up.railway.app/stats"),
      ]);
      setOrders(ordersRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error("Failed to refresh data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const calculateAndSaveStats = async () => {
    const calculatedStats: Stats = {
      liveViews: stats.liveViews,
      totalViews: stats.totalViews,
      uniqueVisitors: stats.uniqueVisitors,
      total: orders.length,
      pending: orders.filter(o => o.orderStatus === "pending").length,
      confirmed: orders.filter(o => o.orderStatus === "confirmed").length,
      delivered: orders.filter(o => o.orderStatus === "delivered").length,
      totalSales: orders
        .filter(o => o.orderStatus === "delivered")
        .reduce((sum, o) => sum + o.total, 0),
      returns: orders.filter(o => o.orderStatus === "returned").length,
      losses: orders
        .filter(o => o.orderStatus === "canceled" || o.orderStatus === "returned")
        .reduce((sum, o) => sum + o.total, 0),
      profit: orders
        .filter(o => o.orderStatus === "delivered")
        .reduce((sum, o) => sum + (o.total - o.shippingFee), 0),
      lastUpdated: new Date().toISOString(),
    };

    try {
      await axios.post("https://sugarcontrollerbackend-production.up.railway.app/stats", calculatedStats);
      setStats(calculatedStats);
    } catch (err) {
      console.error("Failed to save stats:", err);
    }
  };

  const handleChange = (id: string, field: keyof Order, value: any) => {
    setTempOrders((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleUpdate = async (id: string) => {
    const updatedFields = tempOrders[id];
    if (!updatedFields) return;

    try {
      await axios.put(`https://sugarcontrollerbackend-production.up.railway.app/orders/${id}`, updatedFields);
      setOrders((prev) =>
        prev.map((order) => (order._id === id ? { ...order, ...updatedFields } : order))
      );
      setTempOrders((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      // Recalculate and save stats after update
      await calculateAndSaveStats();
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  const formatOrderTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      confirmed: "bg-blue-100 text-blue-800 border-blue-300",
      shipped: "bg-purple-100 text-purple-800 border-purple-300",
      delivered: "bg-green-100 text-green-800 border-green-300",
      canceled: "bg-red-100 text-red-800 border-red-300",
      returned: "bg-gray-100 text-gray-800 border-gray-300",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.phone.includes(searchTerm) ||
      order.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.orderStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Orders Dashboard</h1>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-gray-500">{isConnected ? 'Live' : 'Disconnected'}</span>
                </div>
              </div>
              <p className="text-gray-500">Manage and track all customer orders</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={refreshData}
                disabled={isRefreshing}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-md"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-md">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Views Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-600 text-sm font-medium mb-1">Live Views</p>
                  <p className="text-2xl font-bold text-indigo-900">{stats.liveViews}</p>
                  <p className="text-xs text-indigo-600 mt-1">Currently viewing</p>
                </div>
                <Eye className="w-10 h-10 text-indigo-600 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl p-4 border border-violet-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-violet-600 text-sm font-medium mb-1">Total Views</p>
                  <p className="text-2xl font-bold text-violet-900">{stats.totalViews.toLocaleString()}</p>
                  <p className="text-xs text-violet-600 mt-1">All time</p>
                </div>
                <Activity className="w-10 h-10 text-violet-600 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-fuchsia-50 to-fuchsia-100 rounded-xl p-4 border border-fuchsia-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-fuchsia-600 text-sm font-medium mb-1">Unique Visitors</p>
                  <p className="text-2xl font-bold text-fuchsia-900">{stats.uniqueVisitors.toLocaleString()}</p>
                  <p className="text-xs text-fuchsia-600 mt-1">Distinct users</p>
                </div>
                <Users className="w-10 h-10 text-fuchsia-600 opacity-80" />
              </div>
            </div>
          </div>

          {/* Order Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium mb-1">Total Orders</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <Package className="w-10 h-10 text-blue-600 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-600 text-sm font-medium mb-1">Pending</p>
                  <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
                </div>
                <Clock className="w-10 h-10 text-yellow-600 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium mb-1">Confirmed</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.confirmed}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-purple-600 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium mb-1">Delivered</p>
                  <p className="text-2xl font-bold text-green-900">{stats.delivered}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-600 opacity-80" />
              </div>
            </div>
          </div>

          {/* Financial Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-600 text-sm font-medium mb-1">Total Sales</p>
                  <p className="text-2xl font-bold text-emerald-900">Rs. {stats.totalSales.toLocaleString()}</p>
                </div>
                <DollarSign className="w-10 h-10 text-emerald-600 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 text-sm font-medium mb-1">Returns</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.returns}</p>
                </div>
                <RefreshCw className="w-10 h-10 text-orange-600 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium mb-1">Losses</p>
                  <p className="text-2xl font-bold text-red-900">Rs. {stats.losses.toLocaleString()}</p>
                </div>
                <TrendingDown className="w-10 h-10 text-red-600 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4 border border-teal-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-teal-600 text-sm font-medium mb-1">Profit</p>
                  <p className="text-2xl font-bold text-teal-900">Rs. {stats.profit.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-teal-600 opacity-80" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-slate-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, phone, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white cursor-pointer min-w-[180px]"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="canceled">Canceled</option>
                <option value="returned">Returned</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Customer</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Location</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Order Details</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Tracking ID</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Progress</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No orders found</p>
                      <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
                    </td>
                  </tr>
                )}
                {filteredOrders.map((order) => {
                  const temp = tempOrders[order._id] || {};
                  return (
                    <tr key={order._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{order.name}</span>
                          <span className="text-sm text-gray-500">{order.phone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-gray-900 font-medium">{order.city}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500 max-w-[200px] truncate">{order.address}</span>
                            <button
                              onClick={() => copyToClipboard(order.address, order._id)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {copiedId === order._id ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-gray-900 font-medium">Qty: {order.quantity}</span>
                          <span className="text-sm text-gray-500">Rs. {order.total}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-gray-900 font-medium text-sm">
                            {formatOrderTime(order.orderDate)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(order.orderDate).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={temp.trackingId ?? order.trackingId}
                          onChange={(e) => handleChange(order._id, "trackingId", e.target.value)}
                          placeholder="Enter tracking ID"
                          className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={temp.orderStatus ?? order.orderStatus}
                          onChange={(e) => handleChange(order._id, "orderStatus", e.target.value)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 ${getStatusColor(temp.orderStatus ?? order.orderStatus)}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="canceled">Canceled</option>
                          <option value="returned">Returned</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={temp.progress ?? order.progress}
                            onChange={(e) => handleChange(order._id, "progress", Number(e.target.value))}
                            className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleUpdate(order._id)}
                          disabled={!tempOrders[order._id]}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersDashboard;