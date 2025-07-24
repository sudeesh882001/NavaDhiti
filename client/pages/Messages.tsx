import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  Bell, 
  User, 
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Award
} from "lucide-react";

interface Notification {
  id: string;
  type: 'question_approved' | 'question_answered' | 'answer_voted' | 'question_voted' | 'mention';
  title: string;
  message: string;
  sourceUser?: {
    id: string;
    username: string;
    avatar?: string;
  };
  questionId?: string;
  answerId?: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}



export default function Messages() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  // Check for logged in user and fetch notifications
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      fetchNotifications();
    } else {
      navigate("/login");
      return;
    }
  }, [navigate]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("authToken")}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(data.notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("authToken")}`
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId ? { ...notification, isRead: true } : notification
          )
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("authToken")}`
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.map(notification => ({ ...notification, isRead: true })));
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1 day ago";
    return `${diffInDays} days ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'question_approved': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'question_answered': return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'answer_voted': return <CheckCircle className="h-5 w-5 text-success" />;
      case 'question_voted': return <CheckCircle className="h-5 w-5 text-success" />;
      case 'mention': return <User className="h-5 w-5 text-purple-500" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === "unread") return !notification.isRead;
    if (activeTab === "mentions") return notification.type === "mention";
    return true;
  });

  const unreadCount = notifications.filter(notification => !notification.isRead).length;

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <Card>
            <CardContent className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Please log in</h3>
              <p className="text-muted-foreground">You need to be logged in to view your messages.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Messages & Notifications</h1>
            <p className="text-muted-foreground">
              Stay updated with your DevHub activity
            </p>
          </div>
          
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline">
              Mark all as read
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              All Notifications
              {notifications.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {notifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="mentions">Mentions</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading notifications...</p>
                </CardContent>
              </Card>
            ) : filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                  <p className="text-muted-foreground">
                    {activeTab === "unread"
                      ? "You're all caught up! No unread notifications."
                      : activeTab === "mentions"
                        ? "No mentions yet. Participate in discussions to get mentioned!"
                        : "No notifications yet. Start participating in the community to receive notifications!"
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    !notification.isRead ? 'border-primary/30 bg-primary/5' : ''
                  }`}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.questionId) {
                      navigate(`/question/${notification.questionId}`);
                    }
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`font-medium ${!notification.isRead ? 'font-semibold' : ''}`}>
                            {notification.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>

                        {notification.sourceUser && (
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>from {notification.sourceUser.username}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
