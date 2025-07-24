import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  MessageSquare, 
  User, 
  Settings, 
  HelpCircle,
  Plus,
      Menu,
  X,
    LogOut
} from "lucide-react";
import { useState, useEffect } from "react";

export default function Navigation() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [pendingQuestionsCount, setPendingQuestionsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Fetch counts for badges
  const fetchCounts = async () => {
    const token = localStorage.getItem("authToken");
    if (!token || !user) return;

    try {
      // Fetch pending questions count (admin only)
      if (user.isAdmin) {
        const pendingResponse = await fetch("/api/questions/pending?limit=1", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (pendingResponse.ok) {
          const pendingData = await pendingResponse.json();
          setPendingQuestionsCount(pendingData.total || 0);
        }
      }

      // Fetch unread notifications count
      const notificationsResponse = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        const unreadCount = notificationsData.notifications?.filter((n: any) => !n.isRead).length || 0;
        setUnreadNotificationsCount(unreadCount);
      }
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  };

  // Check for logged in user
  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("authToken");

      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    };

    checkAuth();

    // Listen for storage changes (when user logs in/out in another tab)
    window.addEventListener('storage', checkAuth);

    // Listen for custom auth events
    window.addEventListener('authStateChanged', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('authStateChanged', checkAuth);
    };
  }, []);

  // Fetch counts when user changes
  useEffect(() => {
    if (user) {
      fetchCounts();
      // Set up interval to refresh counts every 30 seconds
      const interval = setInterval(fetchCounts, 30000);
      return () => clearInterval(interval);
    } else {
      setPendingQuestionsCount(0);
      setUnreadNotificationsCount(0);
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setUser(null);
    // Trigger auth state change event
    window.dispatchEvent(new CustomEvent('authStateChanged'));
    window.location.reload();
  };

  const isActive = (path: string) => location.pathname === path;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // TODO: Implement search functionality
      console.log("Searching for:", searchQuery);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="p-2 bg-primary rounded-lg group-hover:bg-primary/90 transition-colors">
                <HelpCircle className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-foreground">DevHub</span>
                <span className="text-xs text-muted-foreground -mt-1">Q&A Platform</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              <Link to="/">
                <Button 
                  variant={isActive("/") ? "secondary" : "ghost"} 
                  size="sm"
                  className="font-medium"
                >
                  Questions
                </Button>
              </Link>
              <Link to="/tags">
                <Button 
                  variant={isActive("/tags") ? "secondary" : "ghost"} 
                  size="sm"
                  className="font-medium"
                >
                  Tags
                </Button>
              </Link>
              <Link to="/users">
                <Button 
                  variant={isActive("/users") ? "secondary" : "ghost"} 
                  size="sm"
                  className="font-medium"
                >
                  Users
                </Button>
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search questions, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 w-full"
                />
              </div>
            </form>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            {/* Ask Question Button */}
            <Link to="/ask">
              <Button size="sm" className="hidden sm:flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Ask Question</span>
              </Button>
            </Link>

                                    {/* User Menu */}
            <div className="hidden md:flex items-center space-x-2">
              {user ? (
                <>
                  <span className="text-sm font-medium">{user.username}</span>
                  <Badge variant="secondary" className="text-xs">
                    {user.reputation} rep
                  </Badge>
                  {user.isAdmin && (
                    <Link to="/admin">
                      <Button variant="ghost" size="sm" title={`Admin Dashboard${pendingQuestionsCount > 0 ? ` (${pendingQuestionsCount} pending)` : ''}`} className="relative">
                        <Settings className="h-4 w-4" />
                        {pendingQuestionsCount > 0 && (
                          <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]">
                            {pendingQuestionsCount}
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  )}
                  <Link to="/messages">
                    <Button variant="ghost" size="sm" title={`Messages & Notifications${unreadNotificationsCount > 0 ? ` (${unreadNotificationsCount} unread)` : ''}`} className="relative">
                      <MessageSquare className="h-4 w-4" />
                      {unreadNotificationsCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]">
                          {unreadNotificationsCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search questions, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 w-full"
                />
              </div>
            </form>

            {/* Mobile Navigation Links */}
            <div className="space-y-2">
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                <Button 
                  variant={isActive("/") ? "secondary" : "ghost"} 
                  size="sm"
                  className="w-full justify-start"
                >
                  Questions
                </Button>
              </Link>
              <Link to="/ask" onClick={() => setMobileMenuOpen(false)}>
                <Button 
                  variant={isActive("/ask") ? "secondary" : "ghost"} 
                  size="sm"
                  className="w-full justify-start"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ask Question
                </Button>
              </Link>
              <Link to="/tags" onClick={() => setMobileMenuOpen(false)}>
                <Button 
                  variant={isActive("/tags") ? "secondary" : "ghost"} 
                  size="sm"
                  className="w-full justify-start"
                >
                  Tags
                </Button>
              </Link>
              <Link to="/users" onClick={() => setMobileMenuOpen(false)}>
                <Button 
                  variant={isActive("/users") ? "secondary" : "ghost"} 
                  size="sm"
                  className="w-full justify-start"
                >
                  Users
                </Button>
              </Link>
              
                            <div className="border-t pt-2 mt-4">
                {user ? (
                  <>
                    <div className="px-3 py-2 text-sm">
                      <div className="font-medium">{user.username}</div>
                      <div className="text-muted-foreground">{user.reputation} reputation</div>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Button>
                                        <Link to="/messages" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Messages
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <User className="h-4 w-4 mr-2" />
                      Login
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
