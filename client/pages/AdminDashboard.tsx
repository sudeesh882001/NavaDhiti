import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  MessageSquare, 
  Flag, 
  Tag,
  TrendingUp,
  TrendingDown,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart,
  Activity,
  Shield,
  Database,
  Settings
} from "lucide-react";

interface PendingQuestion {
  id: string;
  title: string;
  body: string;
  tags: string[];
  author: {
    id: string;
    username: string;
    reputation: number;
    avatar?: string;
  };
  votes: number;
  views: number;
  createdAt: string;
  isApproved: boolean;
}

interface AdminStats {
  totalUsers: number;
  newUsersToday: number;
  totalQuestions: number;
  questionsToday: number;
  totalAnswers: number;
  answersToday: number;
  flaggedContent: number;
  totalViews: number;
  viewsToday: number;
  pendingQuestions: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    newUsersToday: 0,
    totalQuestions: 0,
    questionsToday: 0,
    totalAnswers: 0,
    answersToday: 0,
    flaggedContent: 0,
    totalViews: 0,
    viewsToday: 0,
    pendingQuestions: 0
  });
  const [loading, setLoading] = useState(true);

  // Check if user is admin
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("authToken");
    
    if (storedUser && token) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      
      // Check if user is admin
      if (!userData.isAdmin) {
        toast({
          title: "Access Denied",
          description: "Admin privileges required to access this page.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      
      // Fetch admin data
      fetchPendingQuestions();
    } else {
      navigate("/login");
      return;
    }
  }, [navigate, toast]);

  const fetchPendingQuestions = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/questions/pending", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingQuestions(data.questions);
        setStats(prev => ({ ...prev, pendingQuestions: data.total }));
      } else {
        console.error("Failed to fetch pending questions");
      }
    } catch (error) {
      console.error("Error fetching pending questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const approveQuestion = async (questionId: string) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/questions/${questionId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Question Approved",
          description: "The question has been approved and is now live.",
        });
        
        // Remove from pending questions
        setPendingQuestions(prev => prev.filter(q => q.id !== questionId));
        setStats(prev => ({ ...prev, pendingQuestions: prev.pendingQuestions - 1 }));
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to approve question",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error approving question:", error);
      toast({
        title: "Error",
        description: "Failed to approve question",
        variant: "destructive",
      });
    }
  };

  const rejectQuestion = async (questionId: string) => {
    // For now, we'll just remove it from the pending list
    // In a real app, you might want to add a rejection reason
    setPendingQuestions(prev => prev.filter(q => q.id !== questionId));
    setStats(prev => ({ ...prev, pendingQuestions: prev.pendingQuestions - 1 }));
    
    toast({
      title: "Question Rejected",
      description: "The question has been rejected and removed from pending list.",
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Access denied. Admin privileges required.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Monitor and manage the DevHub community
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              Pending Questions
              {stats.pendingQuestions > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                  {stats.pendingQuestions}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="moderation">Moderation</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Questions</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">{stats.pendingQuestions}</div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting approval
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,247</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-success">+12</span> today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3,456</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-success">+23</span> today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Platform Health</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">Excellent</div>
                  <p className="text-xs text-muted-foreground">
                    All systems operational
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button 
                    onClick={() => document.querySelector('[data-value="pending"]')?.click()}
                    variant={stats.pendingQuestions > 0 ? "default" : "outline"}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Review Pending Questions ({stats.pendingQuestions})
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/users">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Users
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/tags">
                      <Tag className="h-4 w-4 mr-2" />
                      Manage Tags
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Questions Tab */}
          <TabsContent value="pending" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Pending Questions</span>
                  <Badge variant="warning">{pendingQuestions.length}</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Questions waiting for admin approval before going live
                </p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading pending questions...</p>
                  </div>
                ) : pendingQuestions.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                    <p className="text-muted-foreground">No questions are waiting for approval.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {pendingQuestions.map((question) => (
                      <Card key={question.id} className="border-warning/20 bg-warning/5">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            {/* Question Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                  {question.title}
                                </h3>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  <span>By {question.author.username}</span>
                                  <span>•</span>
                                  <span>{formatTimeAgo(question.createdAt)}</span>
                                  <span>•</span>
                                  <span>{question.author.reputation} reputation</span>
                                </div>
                              </div>
                              <Badge variant="warning">Pending</Badge>
                            </div>

                            {/* Question Body */}
                            <div className="bg-muted/50 p-4 rounded-lg">
                              <p className="text-sm leading-relaxed">
                                {question.body.length > 300 
                                  ? `${question.body.substring(0, 300)}...` 
                                  : question.body}
                              </p>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2">
                              {question.tags.map((tag) => (
                                <Badge key={tag} variant="secondary">
                                  {tag}
                                </Badge>
                              ))}
                            </div>

                            {/* Stats */}
                            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <TrendingUp className="h-4 w-4" />
                                <span>{question.votes} votes</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Eye className="h-4 w-4" />
                                <span>{question.views} views</span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex space-x-3 pt-4 border-t">
                              <Button 
                                onClick={() => approveQuestion(question.id)}
                                className="flex-1"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve Question
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => rejectQuestion(question.id)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                              <Button variant="outline" asChild>
                                <Link to={`/questions/${question.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Preview
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Moderation Tab */}
          <TabsContent value="moderation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Moderation</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Review flagged content and manage community standards
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No flagged content</h3>
                  <p className="text-muted-foreground">All content is following community guidelines.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Monitor user activity and manage accounts
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>User Growth</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-success">+12.5%</div>
                      <p className="text-sm text-muted-foreground">vs last month</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Active Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">892</div>
                      <p className="text-sm text-muted-foreground">Last 30 days</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>New Registrations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">12</div>
                      <p className="text-sm text-muted-foreground">Today</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Analytics</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Overview of platform content and engagement
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Popular Tags</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Badge>javascript</Badge>
                          <span className="text-sm">234 questions</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <Badge>react</Badge>
                          <span className="text-sm">189 questions</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <Badge>node.js</Badge>
                          <span className="text-sm">165 questions</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Content Stats</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Questions answered</span>
                          <span className="text-sm font-medium">87%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Accepted answers</span>
                          <span className="text-sm font-medium">64%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Avg. response time</span>
                          <span className="text-sm font-medium">2.3 hours</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
