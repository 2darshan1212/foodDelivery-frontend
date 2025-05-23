import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { checkAdminAccess } from '../../utils/adminUtils';
import { setAuthUser } from '../../redux/authSlice';
import axios from 'axios';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Alert,
  Collapse,
  CssBaseline,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Button
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ShoppingBasket as OrdersIcon,
  CategoryOutlined as CategoryIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  MenuOpen as MenuOpenIcon,
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  ExitToApp as ExitIcon,
  Home as HomeIcon,
  ShoppingCart as ShoppingCartIcon,
  BugReport as BugReportIcon,
  LocalShipping as DeliveryIcon
} from '@mui/icons-material';

const drawerWidth = 240;

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState(null);
  const { user } = useSelector((state) => state.auth);
  const [adminCheckResult, setAdminCheckResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Check if user is admin
  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        if (!user) {
          setError("No user is logged in");
          navigate('/login');
          return;
        }
        
        console.log("Current user state:", user);
        
        // Double-check with backend if user is admin
        if (!user.isAdmin) {
          const userData = await axios.get('http://localhost:8000/api/v1/user/me', {
            withCredentials: true
          });
          
          console.log("User data from backend:", userData.data);
          
          if (userData.data?.user?.isAdmin) {
            // Update Redux store with correct admin status
            dispatch(setAuthUser({
              ...user,
              isAdmin: true
            }));
          } else {
            setError("User is not an admin");
            navigate('/');
            return;
          }
        }
        
        // Run additional diagnostics
        const result = await checkAdminAccess();
        setAdminCheckResult(result);
        
        console.log("Admin access check result:", result);
        
        if (!result.success) {
          setError(result.message);
          if (!result.isAdmin) {
            navigate('/');
          }
        }
      } catch (err) {
        console.error("Admin verification error:", err);
        setError("Error verifying admin status");
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    verifyAdmin();
  }, [user, navigate, dispatch]);
  
  // Handle drawer toggle
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  // Handle profile menu open
  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Handle profile menu close
  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Handle notifications menu open
  const handleNotificationsMenuOpen = (event) => {
    setNotificationsAnchorEl(event.currentTarget);
  };
  
  // Handle notifications menu close
  const handleNotificationsMenuClose = () => {
    setNotificationsAnchorEl(null);
  };
  
  // Handle navigation
  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };
  
  // Check if a route is active
  const isRouteActive = (path) => {
    return location.pathname === path;
  };
  
  // Navigation items
  const navItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
    { text: 'Orders', icon: <OrdersIcon />, path: '/admin/orders' },
    { text: 'Categories', icon: <CategoryIcon />, path: '/admin/categories' },
    { text: 'Users', icon: <PeopleIcon />, path: '/admin/users' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/admin/settings' },
  ];
  
  // If loading, show spinner
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Verifying admin access...
        </Typography>
      </Box>
    );
  }
  
  // If error and not admin access issue, show error
  if (error && (!adminCheckResult || !adminCheckResult.isAdmin)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Alert severity="error" sx={{ maxWidth: 500 }}>
          <Typography variant="h6">Admin Access Error</Typography>
          <Typography variant="body1">{error}</Typography>
          <Box sx={{ mt: 2 }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <Button variant="contained" color="primary">
                Return to home page
              </Button>
            </Link>
          </Box>
        </Alert>
      </Box>
    );
  }
  
  // If errors with admin endpoints but user is admin, show warning but continue
  if (error && adminCheckResult && adminCheckResult.isAdmin) {
    console.warn("Admin endpoints may not be available but continuing with UI:", error);
  }
  
  if (!user || !user.isAdmin) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography variant="body1">You do not have admin privileges.</Typography>
          <Box sx={{ mt: 2 }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <Button variant="contained" color="primary">
                Return to home page
              </Button>
            </Link>
          </Box>
        </Alert>
      </Box>
    );
  }
  
  // Drawer content
  const drawer = (
    <div>
      <Toolbar sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          Admin Panel
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/admin/dashboard"
            selected={location.pathname === "/admin/dashboard"}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/admin/orders"
            selected={location.pathname === "/admin/orders"}
          >
            <ListItemIcon>
              <ShoppingCartIcon />
            </ListItemIcon>
            <ListItemText primary="Orders" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/admin/categories"
            selected={location.pathname === "/admin/categories"}
          >
            <ListItemIcon>
              <CategoryIcon />
            </ListItemIcon>
            <ListItemText primary="Categories" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/admin/users"
            selected={location.pathname === "/admin/users"}
          >
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText primary="Users" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/admin/delivery-agents"
            selected={location.pathname === "/admin/delivery-agents"}
          >
            <ListItemIcon>
              <DeliveryIcon />
            </ListItemIcon>
            <ListItemText primary="Delivery Agents" />
          </ListItemButton>
        </ListItem>
        
        <Divider sx={{ my: 1 }} />
        
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/admin/check"
            selected={location.pathname === "/admin/check"}
          >
            <ListItemIcon>
              <BugReportIcon />
            </ListItemIcon>
            <ListItemText primary="Admin Check" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/"
          >
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary="Return to Site" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );
  
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          boxShadow: 1
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {navItems.find(item => isRouteActive(item.path))?.text || 'Admin Panel'}
          </Typography>
          
          {/* Notifications */}
          <IconButton
            color="inherit"
            onClick={handleNotificationsMenuOpen}
            sx={{ mr: 1 }}
          >
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          
          {/* Profile */}
          <IconButton
            onClick={handleProfileMenuOpen}
            sx={{ p: 0 }}
          >
            <Avatar alt={user.username} src={user.profilePicture} />
          </IconButton>
        </Toolbar>
      </AppBar>
      
      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
            mt: 1.5,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => navigate(`/profile/${user._id}`)}>
          Profile
        </MenuItem>
        <MenuItem onClick={() => navigate('/settings')}>
          Account Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => navigate('/')}>
          Back to App
        </MenuItem>
      </Menu>
      
      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationsAnchorEl}
        open={Boolean(notificationsAnchorEl)}
        onClose={handleNotificationsMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
            mt: 1.5,
            width: 320,
            maxHeight: 400,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem sx={{ display: 'block', py: 1 }}>
          <Typography variant="subtitle2" color="primary">New Order</Typography>
          <Typography variant="body2">John Doe placed a new order</Typography>
          <Typography variant="caption" color="text.secondary">2 minutes ago</Typography>
        </MenuItem>
        <MenuItem sx={{ display: 'block', py: 1 }}>
          <Typography variant="subtitle2" color="error">Order Cancelled</Typography>
          <Typography variant="body2">Order #12345 was cancelled</Typography>
          <Typography variant="caption" color="text.secondary">1 hour ago</Typography>
        </MenuItem>
        <MenuItem sx={{ display: 'block', py: 1 }}>
          <Typography variant="subtitle2" color="warning.main">Low Stock</Typography>
          <Typography variant="body2">Butter Chicken is running low on stock</Typography>
          <Typography variant="caption" color="text.secondary">3 hours ago</Typography>
        </MenuItem>
        <Divider />
        <MenuItem sx={{ justifyContent: 'center' }}>
          <Typography variant="body2" color="primary">
            See All Notifications
          </Typography>
        </MenuItem>
      </Menu>
      
      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      {/* Main content */}
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          width: { sm: `calc(100% - ${drawerWidth}px)` }, 
          minHeight: '100vh',
          bgcolor: '#f5f5f5'
        }}
      >
        <Toolbar /> {/* Spacer for fixed app bar */}
        <Outlet /> {/* Render nested routes */}
      </Box>
    </Box>
  );
};

export default AdminLayout; 