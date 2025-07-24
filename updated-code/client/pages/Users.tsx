import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  User, 
  TrendingUp, 
  Calendar, 
  Award,
  MessageSquare,
  ThumbsUp,
  Users as UsersIcon,
  Medal,
  Star,
  Crown,
  Loader2
} from "lucide-react";

interface UserData {
  id: string; // Changed from number to string to match MongoDB _id
  username: string;
  email: string;
  skills: string[];
  bio: string;
  reputation: number;
  questionsAsked: number;
  answersGiven: number;
  acceptedAnswers: number;
  joinedDate: string;
  topTags: string[];
  isAdmin: boolean;
}

const sortOptions = [
  { value: "reputation", label: "Reputation", icon: TrendingUp },
  { value: "username", label: "Username", icon: User },
  { value: "joined", label: "Newest Users", icon: Calendar },
  { value: "answers", label: "Most Answers", icon: MessageSquare }
];

export default function Users() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("reputation");
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);

  // Fetch all registered users and merge with activity data
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // Fetch all registered users
        console.log('Fetching /api/users...');
        const usersResponse = await fetch('/api/users');
        const usersData = await usersResponse.json();
        console.log('Response from /api/users:', usersData);

        let questionsData = { questions: [] }; // Initialize with empty array
        try {
          // Fetch all questions to get user activity
          console.log('Fetching /api/questions...');
          const questionsResponse = await fetch('/api/questions');
          questionsData = await questionsResponse.json();
          console.log('Response from /api/questions:', questionsData);
        } catch (qError) {
          console.error('Error fetching questions:', qError);
          // Continue without question data if fetch fails
        }
        
        if (usersResponse.ok && usersData.users) {
          // Create activity map from questions and answers
          // Use string for userId to match MongoDB _id
          const userActivity = new Map<string, { 
            questionsAsked: number;
            answersGiven: number;
            acceptedAnswers: number;
            tags: Set<string>;
          }>();

          // Process questions and answers if available
          if (questionsData.questions && Array.isArray(questionsData.questions)) {
            questionsData.questions.forEach((question: any) => {
              // Ensure question.author and question.author.id exist and is a string
              if (question.author && typeof question.author.id === 'string') {
                const userId = question.author.id;
                if (!userActivity.has(userId)) {
                  userActivity.set(userId, {
                    questionsAsked: 0,
                    answersGiven: 0,
                    acceptedAnswers: 0,
                    tags: new Set()
                  });
                }
                
                const userData = userActivity.get(userId)!;
                userData.questionsAsked++;
                
                // Add tags from this question
                if (question.tags && Array.isArray(question.tags)) {
                  question.tags.forEach((tag: string) => userData.tags.add(tag));
                }
                
                // Process answers for this question
                if (question.answers && Array.isArray(question.answers)) {
                  question.answers.forEach((answer: any) => {
                    // Ensure answer.author and answer.author.id exist and is a string
                    if (answer.author && typeof answer.author.id === 'string') {
                      const answerUserId = answer.author.id;
                      if (!userActivity.has(answerUserId)) {
                        userActivity.set(answerUserId, {
                          questionsAsked: 0,
                          answersGiven: 0,
                          acceptedAnswers: 0,
                          tags: new Set()
                        });
                      }
                      
                      const answerUserData = userActivity.get(answerUserId)!;
                      answerUserData.answersGiven++;
                      
                      if (answer.isAccepted) {
                        answerUserData.acceptedAnswers++;
                      }
                    }
                  });
                }
              }
            });
          }

          // Merge registered users with activity data
          const usersArray: UserData[] = usersData.users.map((user: any) => {
            console.log('Raw user object from /api/users before transformation:', user); // NEW LOG
            const activity = userActivity.get(user.id) || {
              questionsAsked: 0,
              answersGiven: 0,
              acceptedAnswers: 0,
              tags: new Set()
            };

            return {
              id: user.id || user._id, // Ensure id is picked correctly
              username: user.username,
              email: user.email,
              skills: user.skills || [],
              bio: user.bio || '',
              reputation: user.reputation,
              questionsAsked: activity.questionsAsked,
              answersGiven: activity.answersGiven,
              acceptedAnswers: activity.acceptedAnswers,
              joinedDate: user.createdAt,
              topTags: Array.from(activity.tags).slice(0, 5),
              isAdmin: user.username === "admin" || user.email === "sudeeshsri882001@gmail.com" // Use your admin email
            };
          });

          console.log('Processed usersArray before setting state:', usersArray);
          setUsers(usersArray);
        } else {
          console.log('Users API response not OK or usersData.users is empty. Falling back to admin mock data.');
          // Fallback to admin only if no users endpoint or data is empty
          setUsers([{
            id: "admin_1", // Changed to string
            username: "admin",
            email: "sudeeshsri882001@gmail.com", // Use your admin email
            skills: ['admin', 'management'],
            bio: 'System Administrator',
            reputation: 50000,
            questionsAsked: 0,
            answersGiven: 0,
            acceptedAnswers: 0,
            joinedDate: "2024-01-01T00:00:00Z",
            topTags: [],
            isAdmin: true
          }]);
        }
      } catch (error) {
        console.error('Error fetching users or questions:', error);
        // Fallback to admin only
        setUsers([{
          id: "admin_1", // Changed to string
          username: "admin",
          email: "sudeeshsri882001@gmail.com", // Use your admin email
          skills: ['admin', 'management'],
          bio: 'System Administrator',
          reputation: 50000,
          questionsAsked: 0,
          answersGiven: 0,
          acceptedAnswers: 0,
          joinedDate: "2024-01-01T00:00:00Z",
          topTags: [],
          isAdmin: true
        }]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter and sort users
  useEffect(() => {
    console.log('Users state before filtering (in filter useEffect):', users); // NEW LOG
    // Ensure searchQuery is always a string for toLowerCase()
    const lowerCaseSearchQuery = searchQuery.toLowerCase();

    let filtered = users.filter(user => {
      console.log('User object being filtered:', user); // NEW LOG - this will show the "undefined"
      // Ensure user and username are valid before calling toLowerCase()
      const usernameMatches = user && typeof user.username === 'string' && user.username.toLowerCase().includes(lowerCaseSearchQuery);

      // Check topTags safely
      const topTagsMatch = user && user.topTags && Array.isArray(user.topTags) && 
        user.topTags.some(tag => typeof tag === 'string' && tag.toLowerCase().includes(lowerCaseSearchQuery));

      // Check skills safely
      const skillsMatch = user && user.skills && Array.isArray(user.skills) && 
        user.skills.some(skill => typeof skill === 'string' && skill.toLowerCase().includes(lowerCaseSearchQuery));
      
      // Log the user being filtered and the result of the checks
      console.log(`Filtering user: ${user?.username || 'undefined'}, usernameMatches: ${usernameMatches}, topTagsMatch: ${topTagsMatch}, skillsMatch: ${skillsMatch}`);

      return usernameMatches || topTagsMatch || skillsMatch;
    });

    // Sort users
    switch (sortBy) {
      case "username":
        filtered.sort((a, b) => a.username.localeCompare(b.username));
        break;
      case "joined":
        filtered.sort((a, b) => new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime());
        break;
      case "answers":
        filtered.sort((a, b) => b.answersGiven - a.answersGiven);
        break;
      default: // reputation
        filtered.sort((a, b) => b.reputation - a.reputation);
    }

    setFilteredUsers(filtered);
  }, [searchQuery, sortBy, users]);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const getUserInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const getUserRank = (reputation: number) => {
    if (reputation >= 10000) return { rank: "Expert", icon: Crown, color: "text-yellow-500" };
    if (reputation >= 5000) return { rank: "Advanced", icon: Medal, color: "text-purple-500" };
    if (reputation >= 1000) return { rank: "Contributor", icon: Star, color: "text-blue-500" };
    return { rank: "Beginner", icon: User, color: "text-gray-500" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-lg">Loading users...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Users</h1>
          <p className="text-muted-foreground">
            Discover and connect with developers in our community
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search users by name or expertise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center space-x-2">
                    <option.icon className="h-4 w-4" />
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Users Grid */}
        {filteredUsers.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No users found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search terms or check back later.
              </p>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Show All Users
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => {
              const userRank = getUserRank(user.reputation);
              const RankIcon = userRank.icon;
              
              return (
                <Link key={user.id} to={`/user/${user.id}`}>
                  <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className={user.isAdmin ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}>
                          {getUserInitials(user.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-foreground truncate">
                            {user.username}
                          </h3>
                          {user.isAdmin && (
                            <Badge variant="default" className="text-xs">
                              Admin
                            </Badge>
                          )}
                          <div className={`flex items-center space-x-1 ${userRank.color}`}>
                            <RankIcon className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span className="font-medium text-primary">
                            {formatNumber(user.reputation)} rep
                          </span>
                          <span>•</span>
                          <span>{userRank.rank}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Questions:</span>
                        <span className="font-medium">{user.questionsAsked}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Answers:</span>
                        <span className="font-medium">{user.answersGiven}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Accepted:</span>
                        <span className="font-medium text-success">{user.acceptedAnswers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Activity:</span>
                        <span className="font-medium">{user.questionsAsked + user.answersGiven}</span>
                      </div>
                    </div>

                    {/* Skills */}
                    {user.skills && user.skills.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-2">Skills:</p>
                        <div className="flex flex-wrap gap-1">
                          {user.skills.slice(0, 3).map((skill, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {user.skills.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.skills.length - 3} more
                            </Badge>
                          )}
                      </div>
                    </div>
                    )}

                    {/* Bio */}
                    {user.bio && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-1">Bio:</p>
                        <p className="text-sm text-foreground line-clamp-2">
                          {user.bio.length > 80 ? user.bio.substring(0, 80) + '...' : user.bio}
                        </p>
                      </div>
                    )}

                    {/* Footer Info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                      <span>Joined {formatJoinDate(user.joinedDate)}</span>
                      {user.isAdmin && (
                        <Badge variant="outline" className="text-xs">
                          Administrator
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Community Stats */}
        {users.length > 0 && (
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="text-center py-6">
                <div className="text-2xl font-bold text-primary">{users.length}</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center py-6">
                <div className="text-2xl font-bold text-primary">
                  {formatNumber(users.reduce((sum, user) => sum + user.reputation, 0))}
                </div>
                <div className="text-sm text-muted-foreground">Total Reputation</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center py-6">
                <div className="text-2xl font-bold text-primary">
                  {users.reduce((sum, user) => sum + user.answersGiven, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Answers Given</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center py-6">
                <div className="text-2xl font-bold text-primary">
                  {users.reduce((sum, user) => sum + user.questionsAsked, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Questions Asked</div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
