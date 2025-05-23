import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Button,
  TextField,
  Tabs,
  Tab,
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Checkbox,
  CircularProgress,
  IconButton,
  InputAdornment,
  Snackbar,
  Alert,
  Divider,
  Chip,
  Fade,
  Slide,
  Grow,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardActionArea,
  Tooltip,
  Menu,
  MenuItem,
  Backdrop
} from '@mui/material';
import { useSelector } from 'react-redux';
import { 
  Search, 
  Users, 
  Globe, 
  Copy, 
  Check, 
  X, 
  Link as LinkIcon, 
  Twitter, 
  Facebook, 
  Instagram,
  Send,
  Mail,
  MessageSquare,
  Share2,
  Clock,
  BarChart2,
  Eye,
  Calendar,
  Smartphone,
  FileText,
  Bookmark,
  ChevronRight,
  ChevronDown,
  Monitor,
  ArrowRight,
  Hash
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './share.css';
import { QRCodeSVG as QRCode } from 'qrcode.react';

// Import custom components
import SharePreview from './SharePreview';
import ShareStats from './ShareStats';
import ScheduledShare from './ScheduledShare';
import ShareHistory from './ShareHistory';

// Tab panel component
const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`share-tabpanel-${index}`}
      aria-labelledby={`share-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Fade in={value === index} timeout={300}>
          <Box sx={{ p: 2 }}>
            {children}
          </Box>
        </Fade>
      )}
    </div>
  );
};

const ShareDialog = ({ open, onClose, post, onShareSuccess }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState('users');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [previewPlatform, setPreviewPlatform] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [moreOptionsAnchor, setMoreOptionsAnchor] = useState(null);
  
  const { user } = useSelector((store) => store.auth);
  
  const dialogRef = useRef(null);
  
  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      fetchUsers();
      setShareSuccess(false);
      setShareLink('');
      setMessage('');
      setSelectedUsers([]);
      setPreviewPlatform('');
      setConfirmClose(false);
    }
  }, [open]);
  
  // Fetch users from the API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        'http://localhost:8000/api/v1/user/suggested-users',
        { withCredentials: true }
      );
      
      if (res.data.success) {
        setUsers(res.data.suggestedUser || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error loading users');
    } finally {
      setLoading(false);
    }
  };
  
  // Filter users based on search query
  const filteredUsers = searchQuery.trim() 
    ? users.filter(u => 
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle sub-tab change
  const handleSubTabChange = (subtab) => {
    setActiveSubTab(subtab);
  };
  
  // Toggle user selection
  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };
  
  // Handle share with selected users
  const handleShareWithUsers = async () => {
    if (selectedUsers.length === 0) {
      toast.warning('Please select at least one user');
      return;
    }
    
    try {
      setShareLoading(true);
      
      const res = await axios.post(
        'http://localhost:8000/api/v1/share/create',
        {
          postId: post._id,
          sharedWith: 'specific',
          recipients: selectedUsers,
          message: message,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );
      
      if (res.data.success) {
        setShareSuccess(true);
        setShareLink(res.data.shareLink);
        
        // Call onShareSuccess handler if provided
        if (onShareSuccess) {
          onShareSuccess();
        }
        
        // Clear form
        setMessage('');
        setSelectedUsers([]);
        
        // Show success toast
        toast.success('Post shared successfully!');
        
        // Close dialog after delay
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      toast.error(error?.response?.data?.message || 'Error sharing post');
    } finally {
      setShareLoading(false);
    }
  };
  
  // Handle share with followers
  const handleShareWithFollowers = async () => {
    try {
      setShareLoading(true);
      
      const res = await axios.post(
        'http://localhost:8000/api/v1/share/create',
        {
          postId: post._id,
          sharedWith: 'followers',
          message: message,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );
      
      if (res.data.success) {
        setShareSuccess(true);
        setShareLink(res.data.shareLink);
        
        // Call onShareSuccess handler if provided
        if (onShareSuccess) {
          onShareSuccess();
        }
        
        // Clear form
        setMessage('');
        
        // Show success toast
        toast.success('Post shared with your followers!');
        
        // Close dialog after delay
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Error sharing post with followers:', error);
      toast.error(error?.response?.data?.message || 'Error sharing post');
    } finally {
      setShareLoading(false);
    }
  };
  
  // Handle share via external platform
  const handleExternalShare = async (platform) => {
    setPreviewPlatform(platform);
    
    try {
      setShareLoading(true);
      
      // First create a share record
      const res = await axios.post(
        'http://localhost:8000/api/v1/share/create',
        {
          postId: post._id,
          sharedWith: 'external',
          externalPlatform: platform,
          message: message,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );
      
      if (res.data.success) {
        // Get the share link
        const shareUrl = res.data.shareLink;
        setShareLink(shareUrl);
        
        // Call onShareSuccess handler if provided
        if (onShareSuccess) {
          onShareSuccess();
        }
        
        // Construct platform-specific share links
        let externalUrl = '';
        const encodedMessage = encodeURIComponent(message || `Check out this delicious food post: ${post.caption}`);
        const encodedUrl = encodeURIComponent(shareUrl);
        
        switch (platform) {
          case 'twitter':
            externalUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedMessage}`;
            break;
          case 'facebook':
            externalUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
            break;
          case 'whatsapp':
            externalUrl = `https://api.whatsapp.com/send?text=${encodedMessage} ${encodedUrl}`;
            break;
          case 'telegram':
            externalUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`;
            break;
          case 'email':
            externalUrl = `mailto:?subject=${encodeURIComponent(`Shared Food Post: ${post.caption}`)}&body=${encodeURIComponent(`${message || 'Check out this delicious food post!'}\n\n${shareUrl}`)}`;
            break;
          case 'linkedin':
            externalUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodeURIComponent(post.caption)}&summary=${encodedMessage}`;
            break;
          case 'pinterest':
            externalUrl = `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodeURIComponent(post.image)}&description=${encodedMessage}`;
            break;
          case 'reddit':
            externalUrl = `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedMessage}`;
            break;
          case 'copy':
            navigator.clipboard.writeText(shareUrl);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 3000);
            break;
          default:
            break;
        }
        
        // Open external url if not copy
        if (platform !== 'copy' && externalUrl) {
          window.open(externalUrl, '_blank', 'noopener,noreferrer');
        }
        
        // Record analytics for the share
        try {
          await axios.post(
            'http://localhost:8000/api/v1/analytics/record',
            {
              type: 'share',
              postId: post._id,
              platform,
              shareId: res.data.shareId
            },
            { withCredentials: true }
          );
        } catch (analyticsError) {
          console.error('Failed to record share analytics:', analyticsError);
          // Continue even if analytics fails
        }
        
        setShareSuccess(true);
        
        // Don't close dialog immediately for copy to show success message
        if (platform !== 'copy') {
          setTimeout(() => {
            onClose();
          }, 1000);
        }
      }
    } catch (error) {
      console.error(`Error sharing via ${platform}:`, error);
      toast.error(`Error sharing via ${platform}`);
    } finally {
      setShareLoading(false);
    }
  };
  
  // Copy share link to clipboard
  const handleCopyLink = async () => {
    if (!shareLink) {
      try {
        const res = await axios.post(
          'http://localhost:8000/api/v1/share/create',
          {
            postId: post._id,
            sharedWith: 'public',
          },
          {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true,
          }
        );
        
        if (res.data.success) {
          setShareLink(res.data.shareLink);
          navigator.clipboard.writeText(res.data.shareLink);
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 3000);
          
          // Call onShareSuccess handler if provided
          if (onShareSuccess) {
            onShareSuccess();
          }
        }
      } catch (error) {
        console.error('Error generating share link:', error);
        toast.error('Error generating share link');
      }
    } else {
      navigator.clipboard.writeText(shareLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };
  
  // Handle scheduled share
  const handleScheduledShare = (scheduleData) => {
    // In a real implementation, this would send the schedule data to the server
    console.log("Scheduled share data:", scheduleData);
    
    // Show success message
    toast.success('Share scheduled successfully!');
    
    // Call onShareSuccess handler if provided
    if (onShareSuccess) {
      onShareSuccess();
    }
  };
  
  // Handle dialog close with confirmation if needed
  const handleCloseDialog = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // If the user has entered a message or selected users/platform, show confirmation
    if (message || selectedUsers.length > 0 || previewPlatform) {
      setConfirmClose(true);
    } else {
      // Otherwise just close
      if (onClose) onClose();
    }
  }, [message, selectedUsers, previewPlatform, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    e.preventDefault();
    handleCloseDialog(e);
  };

  // Cancel close confirmation
  const handleCancelClose = () => {
    setConfirmClose(false);
  };

  // Confirm close and close dialog
  const handleConfirmClose = () => {
    setConfirmClose(false);
    if (onClose) onClose();
  };

  // Go back to main tab from any tab with event handling
  const handleBackToMainTab = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setActiveTab(0);
  };

  // Clear platform preview with event handling
  const handleClearPlatformPreview = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setPreviewPlatform(null);
  };

  // Handle more options menu
  const handleMoreOptionsOpen = (event) => {
    setMoreOptionsAnchor(event.currentTarget);
  };

  const handleMoreOptionsClose = () => {
    setMoreOptionsAnchor(null);
  };

  // Handle save as draft
  const handleSaveAsDraft = () => {
    // Here you would implement logic to save the current share as a draft
    toast.info('Share saved as draft');
    handleMoreOptionsClose();
  };
  
  // Update the renderSharePlatforms function with these enhanced platform options
  const renderSharePlatforms = () => {
    const platforms = [
      { id: 'twitter', name: 'Twitter', icon: <Twitter size={24} className="text-[#1DA1F2]" /> },
      { id: 'facebook', name: 'Facebook', icon: <Facebook size={24} className="text-[#4267B2]" /> },
      { id: 'whatsapp', name: 'WhatsApp', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg> },
      { id: 'telegram', name: 'Telegram', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="#0088cc"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.067l-1.702 8.518c-.127.632-.549.792-1.114.492l-3.076-2.269-1.485 1.429c-.165.165-.304.304-.62.304l.222-3.116 5.673-5.125c.246-.222-.054-.346-.384-.124l-7.017 4.42-3.024-.937c-.656-.204-.669-.656.137-.973l11.8-4.545c.548-.203 1.025.126.59 1.926z" /></svg> },
      { id: 'email', name: 'Email', icon: <Mail size={24} className="text-[#EA4335]" /> },
      { id: 'linkedin', name: 'LinkedIn', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg> },
      { id: 'pinterest', name: 'Pinterest', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="#E60023"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" /></svg> },
      { id: 'reddit', name: 'Reddit', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="#FF4500"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" /></svg> },
      { id: 'copy', name: 'Copy Link', icon: <LinkIcon size={24} className="text-gray-700" /> },
    ];

    return (
      <Grid container spacing={2} className="mb-3">
        {platforms.map((platform) => (
          <Grid item xs={4} sm={3} key={platform.id}>
            <Card 
              variant="outlined" 
              className={`flex flex-col items-center p-2 ${
                previewPlatform === platform.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <CardActionArea 
                className="w-full h-full flex flex-col items-center py-2"
                onClick={() => {
                  if (platform.id === 'copy') {
                    handleCopyLink();
                  } else {
                    setPreviewPlatform(platform.id);
                  }
                }}
                disabled={shareLoading}
              >
                <div className="mb-2">
                  {platform.id === 'copy' && copySuccess ? (
                    <Check size={24} className="text-green-500" />
                  ) : (
                    platform.icon
                  )}
                </div>
                <Typography variant="caption" className="text-center">
                  {platform.id === 'copy' && copySuccess ? 'Copied!' : platform.name}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  // Add this function for rendering QR code
  const renderQRCode = () => {
    if (!shareLink) return null;
    
    return (
      <Box className="flex flex-col items-center my-4 p-4 bg-white rounded-lg border border-gray-200">
        <Typography variant="subtitle2" gutterBottom>Scan QR Code</Typography>
        <QRCode 
          value={shareLink} 
          size={160}
          level="H"
          includeMargin={true}
          renderAs="canvas"
        />
        <Typography variant="caption" color="text.secondary" className="mt-2">
          Scan with a smartphone camera to open link
        </Typography>
      </Box>
    );
  };

  // Use a memoized reference to handleCloseDialog for event listeners
  const memoizedCloseHandler = useCallback((e) => {
    handleCloseDialog(e);
  }, [handleCloseDialog]);

  // Handle keydown events
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        memoizedCloseHandler(e);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, memoizedCloseHandler]);

  // Add direct DOM method to close dialog
  const forceCloseDialog = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Reset internal state
    setShareSuccess(false);
    setMessage('');
    setSelectedUsers([]);
    setPreviewPlatform(null);
    setShareLink('');
    setCopySuccess(false);
    
    // Call the parent's onClose handler
    if (onClose) {
      onClose();
    } else {
      // Fallback using DOM for emergency cases
      const closeButton = document.querySelector('.MuiDialog-root .MuiButtonBase-root[aria-label="close"]');
      if (closeButton) {
        closeButton.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
      }
    }
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        className="share-dialog"
        aria-labelledby="share-dialog-title"
        TransitionComponent={Slide}
        TransitionProps={{ direction: "up" }}
        ref={dialogRef}
        disableEscapeKeyDown={false}
        closeAfterTransition
        sx={{ zIndex: 1300 }}
      >
        <DialogTitle className="flex justify-between items-center">
          <Typography variant="h6" component="div" className="font-medium">
            Share Post
          </Typography>
          <div className="flex items-center">
            <Tooltip title="More options">
              <IconButton onClick={handleMoreOptionsOpen} className="mr-1">
                <Globe size={18} />
              </IconButton>
            </Tooltip>
            <IconButton 
              edge="end" 
              color="inherit" 
              onClick={forceCloseDialog} 
              aria-label="close"
              className="z-50"
            >
              <X size={18} />
            </IconButton>
          </div>
        </DialogTitle>
        
        {/* Post preview */}
        <Box className="px-6 py-2 flex items-center gap-3 bg-gray-50">
          <img 
            src={post?.image} 
            alt={post?.caption} 
            className="w-12 h-12 object-cover rounded-md"
          />
          <div className="flex-1 min-w-0">
            <Typography variant="subtitle2" noWrap>
              {post?.caption}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              by {post?.author?.username}
            </Typography>
          </div>
        </Box>
        
        <Divider />
        
        {shareSuccess ? (
          <DialogContent>
            <div className="text-center py-4">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-500 mb-4 success-icon">
                  <Check size={32} />
                </div>
                <Typography variant="h6" gutterBottom>
                  Post Shared Successfully!
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Your post has been shared.
                </Typography>
              </div>
              
              {shareLink && (
                <div className="mt-4">
                  <Typography variant="subtitle2" gutterBottom>
                    Share link:
                  </Typography>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded mb-4">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 bg-transparent border-none outline-none text-sm"
                    />
                    <Button 
                      variant="outlined" 
                      size="small" 
                      startIcon={copySuccess ? <Check size={16} /> : <Copy size={16} />}
                      onClick={handleCopyLink}
                      className={copySuccess ? "text-green-500" : ""}
                    >
                      {copySuccess ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        ) : (
          <>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              centered
              variant="scrollable"
              scrollButtons="auto"
              className="share-tabs m-2"
            >
              <Tab icon={<Share2 size={16} />} label="Share" />
              <Tab icon={<Clock size={16} />} label="Schedule" />
              <Tab icon={<BarChart2 size={16} />} label="Analytics" />
              <Tab icon={<Clock size={16} />} label="History" />
            </Tabs>
            
            <DialogContent dividers className="share-dialog-content">
              {/* Share tab */}
              <TabPanel value={activeTab} index={0}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={7}>
                    {/* Add a message field */}
                    <TextField
                      label="Add a message"
                      multiline
                      rows={2}
                      fullWidth
                      variant="outlined"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      margin="normal"
                      placeholder="Write a message to accompany your shared post..."
                    />
                    
                    {/* Share platforms */}
                    <Typography variant="subtitle2" gutterBottom className="mt-3">
                      Share on
                    </Typography>
                    {renderSharePlatforms()}
                    
                    {/* Advanced sharing options */}
                    <Box className="mt-4">
                      <Typography variant="subtitle2" gutterBottom className="flex items-center">
                        <Hash size={16} className="mr-1" /> Include hashtags
                      </Typography>
                      <Box className="flex gap-1 flex-wrap mb-3">
                        {['#foodie', '#delicious', '#homemade', '#yummy'].map((tag) => (
                          <Chip 
                            key={tag} 
                            label={tag} 
                            size="small" 
                            variant="outlined" 
                            onClick={() => setMessage(prev => prev ? `${prev} ${tag}` : tag)}
                            className="cursor-pointer hover:bg-blue-50"
                          />
                        ))}
                        {post?.category && (
                          <Chip 
                            label={`#${post.category.toLowerCase()}`} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                            onClick={() => setMessage(prev => prev ? `${prev} #${post.category.toLowerCase()}` : `#${post.category.toLowerCase()}`)}
                            className="cursor-pointer"
                          />
                        )}
                        {post?.vegetarian && (
                          <Chip 
                            label="#vegetarian" 
                            size="small" 
                            color="success" 
                            variant="outlined" 
                            onClick={() => setMessage(prev => prev ? `${prev} #vegetarian` : "#vegetarian")}
                            className="cursor-pointer"
                          />
                        )}
                      </Box>
                    </Box>
                    
                    {/* Share with specific users section */}
                    <div className="mt-4">
                      <Accordion>
                        <AccordionSummary expandIcon={<ChevronDown size={16} />}>
                          <Box className="flex items-center">
                            <Users size={16} className="mr-2" />
                            <Typography variant="subtitle2">Share with specific users</Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <TextField
                            fullWidth
                            placeholder="Search users..."
                            variant="outlined"
                            size="small"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Search size={18} />
                                </InputAdornment>
                              ),
                            }}
                            className="mb-3"
                          />
                          
                          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                            {loading ? (
                              <div className="flex justify-center py-4">
                                <CircularProgress size={24} />
                              </div>
                            ) : filteredUsers.length === 0 ? (
                              <div className="py-4 px-3 text-center text-gray-500">
                                No users found
                              </div>
                            ) : (
                              <List dense>
                                {filteredUsers.map((u) => (
                                  <ListItem key={u._id} className="py-1">
                                    <ListItemAvatar>
                                      <Avatar src={u.profilePicture} alt={u.username} />
                                    </ListItemAvatar>
                                    <ListItemText 
                                      primary={u.username} 
                                      secondary={u.location ? u.location.address : ''}
                                    />
                                    <Checkbox
                                      edge="end"
                                      checked={selectedUsers.includes(u._id)}
                                      onChange={() => toggleUserSelection(u._id)}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            )}
                          </div>
                          
                          <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            disabled={selectedUsers.length === 0 || shareLoading}
                            onClick={handleShareWithUsers}
                            className="mt-3"
                            startIcon={shareLoading ? <CircularProgress size={20} /> : <Send size={16} />}
                          >
                            {shareLoading ? "Sharing..." : "Share with selected users"}
                          </Button>
                        </AccordionDetails>
                      </Accordion>
                      
                      <Accordion>
                        <AccordionSummary expandIcon={<ChevronDown size={16} />}>
                          <Box className="flex items-center">
                            <Users size={16} className="mr-2" />
                            <Typography variant="subtitle2">Share with all followers</Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            Share this post with all your followers. They'll receive a notification.
                          </Typography>
                          <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            disabled={shareLoading}
                            onClick={handleShareWithFollowers}
                            startIcon={shareLoading ? <CircularProgress size={20} /> : <Send size={16} />}
                          >
                            {shareLoading ? "Sharing..." : "Share with all followers"}
                          </Button>
                        </AccordionDetails>
                      </Accordion>
                    </div>
                  </Grid>
                  <Grid item xs={12} md={5}>
                    {/* Preview area */}
                    <SharePreview 
                      platform={previewPlatform} 
                      post={post} 
                      message={message} 
                      user={user}
                      shareLink={shareLink}
                      onClose={handleClearPlatformPreview}
                    />
                    
                    {/* Show QR code when a platform is selected */}
                    {previewPlatform && (
                      <Box className="mt-4">
                        <Button
                          variant="contained"
                          color="primary"
                          fullWidth
                          disabled={shareLoading}
                          onClick={() => handleExternalShare(previewPlatform)}
                          startIcon={shareLoading ? <CircularProgress size={20} /> : <Share2 size={16} />}
                        >
                          {shareLoading ? "Sharing..." : `Share on ${previewPlatform.charAt(0).toUpperCase() + previewPlatform.slice(1)}`}
                        </Button>
                        {(shareLink && previewPlatform !== 'copy') && renderQRCode()}
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </TabPanel>
              
              {/* Schedule tab */}
              <TabPanel value={activeTab} index={1}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={7}>
                    <ScheduledShare onSchedule={handleScheduledShare} />
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <div className="bg-gray-50 p-4 rounded-lg h-full">
                      <Typography variant="subtitle2" className="mb-4 font-medium flex items-center">
                        <Eye size={18} className="mr-2 text-orange-500" />
                        Preview
                      </Typography>
                      <SharePreview 
                        platform="facebook" 
                        post={post}
                        message={message}
                        user={user}
                        onClose={() => {/* Preview in schedule tab is static */}}
                      />
                    </div>
                  </Grid>
                </Grid>
              </TabPanel>
              
              {/* Analytics tab */}
              <TabPanel value={activeTab} index={2}>
                <ShareStats 
                  postId={post._id} 
                  onClose={handleBackToMainTab}
                />
              </TabPanel>
              
              {/* History tab */}
              <TabPanel value={activeTab} index={3}>
                <ShareHistory 
                  postId={post._id} 
                  onClose={handleBackToMainTab}
                />
              </TabPanel>
            </DialogContent>
            
            <DialogActions className="flex justify-between">
              <Button 
                onClick={forceCloseDialog} 
                color="inherit"
                variant="outlined"
                startIcon={<X size={16} />}
              >
                Cancel
              </Button>
              
              {activeTab === 0 && (
                <div className="flex gap-2">
                  {previewPlatform ? (
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={shareLoading}
                      onClick={() => handleExternalShare(previewPlatform)}
                      startIcon={shareLoading ? <CircularProgress size={20} /> : <Share2 size={16} />}
                    >
                      {shareLoading ? "Sharing..." : `Share on ${previewPlatform.charAt(0).toUpperCase() + previewPlatform.slice(1)}`}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={shareLoading}
                      onClick={handleCopyLink}
                      startIcon={shareLoading ? <CircularProgress size={20} /> : <Copy size={16} />}
                    >
                      {shareLoading ? "Processing..." : copySuccess ? "Copied!" : "Generate Link"}
                    </Button>
                  )}
                </div>
              )}
            </DialogActions>
          </>
        )}
        
        <Snackbar 
          open={copySuccess} 
          autoHideDuration={3000} 
          onClose={() => setCopySuccess(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" variant="filled">
            Link copied to clipboard
          </Alert>
        </Snackbar>
      </Dialog>

      {/* More options menu */}
      <Menu
        anchorEl={moreOptionsAnchor}
        open={Boolean(moreOptionsAnchor)}
        onClose={handleMoreOptionsClose}
      >
        <MenuItem onClick={handleSaveAsDraft}>
          <Bookmark size={16} className="mr-2" /> Save as draft
        </MenuItem>
        <MenuItem onClick={handleMoreOptionsClose}>
          <FileText size={16} className="mr-2" /> View templates
        </MenuItem>
        <MenuItem onClick={handleMoreOptionsClose}>
          <Globe size={16} className="mr-2" /> Share settings
        </MenuItem>
      </Menu>

      {/* Confirmation dialog */}
      <Dialog
        open={confirmClose}
        onClose={handleCancelClose}
        aria-labelledby="confirm-close-dialog"
      >
        <DialogTitle id="confirm-close-dialog">Discard changes?</DialogTitle>
        <DialogContent>
          <Typography>
            You have unsaved changes. Are you sure you want to close without sharing?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmClose} color="error">
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ShareDialog; 