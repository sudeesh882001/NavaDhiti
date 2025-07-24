import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User, 
  Mail, 
  Trophy, 
  Tag,
  Edit,
  Save,
  X,
  Plus,
  AlertCircle,
  CheckCircle
} from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  skills: string[];
  bio: string;
  reputation: number;
  isAdmin: boolean;
}

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Edit form state
  const [editData, setEditData] = useState({
    username: "",
    skills: [] as string[],
    bio: ""
  });
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem("user");
    const token = localStorage.getItem("authToken");
    
    console.log('Profile page - checking auth:', { userData: !!userData, token: !!token });
    
    if (!userData || !token) {
      console.log('Profile page - no auth data, redirecting to login');
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      console.log('Profile page - parsed user:', parsedUser);
      
      // Ensure user has all required fields with defaults
      const userWithDefaults = {
        id: parsedUser.id || parsedUser._id || 'unknown',
        username: parsedUser.username || 'Unknown User',
        email: parsedUser.email || 'unknown@email.com',
        skills: Array.isArray(parsedUser.skills) ? parsedUser.skills : [],
        bio: parsedUser.bio || '',
        reputation: parsedUser.reputation || 1,
        isAdmin: parsedUser.isAdmin || false
      };
      
      setUser(userWithDefaults);
      setEditData({
        username: userWithDefaults.username,
        skills: [...userWithDefaults.skills],
        bio: userWithDefaults.bio
      });
      
      console.log('Profile page - user set successfully:', userWithDefaults);
    } catch (error) {
      console.error("Error parsing user data:", error);
      navigate("/login");
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const addSkill = () => {
    if (skillInput.trim() && !editData.skills.includes(skillInput.trim().toLowerCase())) {
      setEditData(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim().toLowerCase()]
      }));
      setSkillInput("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setEditData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSkillKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          username: editData.username,
          skills: editData.skills,
          bio: editData.bio
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Profile update error response:', errorText);
        throw new Error(`Failed to update profile: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      // Update local storage and state
      const updatedUser = { ...user, ...data.user };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
      setSuccess("Profile updated successfully!");

    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setEditData({
        username: user.username,
        skills: user.skills ? [...user.skills] : [],
        bio: user.bio || ''
      });
    }
    setIsEditing(false);
    setError("");
    setSuccess("");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-600 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your account information and skills
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile Information</span>
            </CardTitle>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Username */}
            <div className="space-y-2">
              <Label className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Username</span>
              </Label>
              {isEditing ? (
                <Input
                  value={editData.username}
                  onChange={(e) => setEditData(prev => ({ ...prev, username: e.target.value }))}
                  disabled={isLoading}
                  minLength={3}
                />
              ) : (
                <p className="text-foreground font-medium">{user.username}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </Label>
              <p className="text-muted-foreground">{user.email}</p>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Bio</span>
              </Label>
              {isEditing ? (
                <textarea
                  className="w-full min-h-[100px] p-3 border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="Tell us about yourself..."
                  value={editData.bio}
                  onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                  disabled={isLoading}
                  maxLength={500}
                />
              ) : (
                <p className="text-foreground whitespace-pre-wrap">
                  {user.bio || "No bio added yet."}
                </p>
              )}
              {isEditing && (
                <p className="text-xs text-muted-foreground">
                  {editData.bio.length}/500 characters
                </p>
              )}
            </div>

            {/* Reputation */}
            <div className="space-y-2">
              <Label className="flex items-center space-x-2">
                <Trophy className="h-4 w-4" />
                <span>Reputation</span>
              </Label>
              <p className="text-foreground font-medium">{user.reputation} points</p>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label className="flex items-center space-x-2">
                <Tag className="h-4 w-4" />
                <span>Skills</span>
              </Label>
              
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Add a skill and press Enter"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={handleSkillKeyPress}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      onClick={addSkill}
                      disabled={isLoading || !skillInput.trim()}
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {editData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editData.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="ml-2 text-primary/60 hover:text-primary"
                            disabled={isLoading}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {editData.skills.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Please add at least one skill
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {user.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-secondary text-secondary-foreground"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Edit Actions */}
            {isEditing && (
              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isLoading || editData.skills.length === 0}
                  className="flex-1"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-white rounded-full" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Save className="h-4 w-4" />
                      <span>Save Changes</span>
                    </div>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mt-4 border-success text-success">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
