import React, { useState, useRef, useEffect } from "react";
import { MapPin, Search, ShoppingCart, Filter, X, Clock, SortAsc, Star, ChevronDown, Tag, Percent } from "lucide-react";
import { Avatar, Badge, Chip, Slider, FormControlLabel, Checkbox, Tooltip, Switch, Rating, Select, MenuItem, TextField, FormGroup, Collapse } from "@mui/material";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setAuthUser } from "../../redux/authSlice";
import { setPosts, setSelectedPost } from "../../redux/postSlice";

// API base URL from environment or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((store) => store.auth);
  const { cartItems } = useSelector((store) => store.cart);
  const dispatch = useDispatch();

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState({ users: [], posts: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const [category, setCategory] = useState("All");
  const [categories, setCategories] = useState(["All"]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [resultsPage, setResultsPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedFilterSections, setExpandedFilterSections] = useState({
    categories: true,
    price: true, 
    rating: true,
    dietary: true,
    sort: true
  });
  const [advancedFilters, setAdvancedFilters] = useState({
    priceRange: [0, 2000], // Higher price range for Indian Rupees
    rating: 0,
    sortBy: "relevance", // relevance, date, rating, price_low, price_high
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    spicyLevel: "any", // any, mild, medium, hot
    discounted: false,  // Items with discounts
    newlyAdded: false,  // Items recently added
    bestSeller: false,  // Popular/best-selling items
    pricePerServing: "any", // any, low, medium, high
    cuisine: [],  // Array of cuisine types (Indian, Chinese, Italian, etc.)
    deliveryTime: "any" // any, fast (under 30min), standard (30-60min)
  });
  const searchTimeout = useRef(null);
  const blurTimeout = useRef(null);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const filterRef = useRef(null);

  // Parse URL parameters on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const q = searchParams.get('q');
    const cat = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const rating = searchParams.get('rating');
    const sort = searchParams.get('sort');
    const veg = searchParams.get('vegetarian');
    const spicy = searchParams.get('spicy');
    const vegan = searchParams.get('vegan');
    const glutenFree = searchParams.get('glutenFree');
    const discounted = searchParams.get('discounted');
    const newItems = searchParams.get('new');
    const bestSeller = searchParams.get('bestSeller');
    const pricePerServing = searchParams.get('pricePerServing');
    const cuisines = searchParams.get('cuisine')?.split(',');
    const deliveryTime = searchParams.get('deliveryTime');
    
    if (q) setSearchTerm(q);
    if (cat && cat !== 'All') {
      setCategory(cat);
      setSelectedCategories(cat.split(','));
    }
    
    // Set advanced filters from URL params
    const newAdvancedFilters = {...advancedFilters};
    if (minPrice && maxPrice) newAdvancedFilters.priceRange = [Number(minPrice), Number(maxPrice)];
    if (rating) newAdvancedFilters.rating = Number(rating);
    if (sort) newAdvancedFilters.sortBy = sort;
    if (veg) newAdvancedFilters.vegetarian = veg === 'true';
    if (vegan) newAdvancedFilters.vegan = vegan === 'true';
    if (glutenFree) newAdvancedFilters.glutenFree = glutenFree === 'true';
    if (spicy) newAdvancedFilters.spicyLevel = spicy;
    if (discounted) newAdvancedFilters.discounted = discounted === 'true';
    if (newItems) newAdvancedFilters.newlyAdded = newItems === 'true';
    if (bestSeller) newAdvancedFilters.bestSeller = bestSeller === 'true';
    if (pricePerServing) newAdvancedFilters.pricePerServing = pricePerServing;
    if (cuisines) newAdvancedFilters.cuisine = cuisines;
    if (deliveryTime) newAdvancedFilters.deliveryTime = deliveryTime;
    
    setAdvancedFilters(newAdvancedFilters);
    
    // If there's a search query in the URL, perform the search
    if (q || cat || minPrice || maxPrice || rating || sort || veg || spicy || 
        vegan || glutenFree || discounted || newItems || bestSeller || 
        pricePerServing || cuisines || deliveryTime) {
      doSearch(q || '', cat || 'All', true);
    }
  }, [location.search]);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const savedSearches = localStorage.getItem('recentSearches');
      if (savedSearches) {
        setRecentSearches(JSON.parse(savedSearches).slice(0, 5));
      }
    } catch (e) {
      console.error("Error loading recent searches:", e);
    }
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/v1/post/search?q=`, { withCredentials: true });
        if (res.data.categories && res.data.categories.length > 0) {
          setCategories(["All", ...res.data.categories]);
        }
      } catch (e) {
        console.error("Error fetching categories:", e);
        setCategories(["All"]);
      }
    }
    fetchCategories();
  }, []);

  // Handle clicks outside of dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        searchInputRef.current && 
        !searchInputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
        setShowRecentSearches(false);
      }
      
      if (
        filterRef.current && 
        !filterRef.current.contains(event.target) &&
        !event.target.closest('[data-filter-toggle]')
      ) {
        setShowMobileFilters(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle filter section expansion
  const toggleFilterSection = (section) => {
    setExpandedFilterSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Save search term to recent searches
  const saveToRecentSearches = (term) => {
    if (!term.trim()) return;
    
    try {
      const updatedSearches = [
        term,
        ...recentSearches.filter(s => s !== term)
      ].slice(0, 5);
      
      setRecentSearches(updatedSearches);
      localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
    } catch (e) {
      console.error("Error saving recent searches:", e);
    }
  };

  // Unified search function
  const doSearch = async (value, cat, updateUrl = false, page = 1) => {
    if (!value.trim() && (!cat || cat === "All") && selectedCategories.length === 0 &&
        !advancedFilters.vegetarian && advancedFilters.rating === 0 && 
        advancedFilters.spicyLevel === 'any' && !advancedFilters.vegan && 
        !advancedFilters.glutenFree && !advancedFilters.discounted && 
        !advancedFilters.newlyAdded && !advancedFilters.bestSeller && 
        advancedFilters.pricePerServing === 'any' && advancedFilters.cuisine.length === 0 &&
        advancedFilters.deliveryTime === 'any' &&
        advancedFilters.priceRange[0] === 0 && advancedFilters.priceRange[1] === 2000) {
      setSearchResults({ users: [], posts: [] });
      setShowDropdown(false);
      return;
    }
    
    try {
      setIsSearching(true);
      
      // Build the category filter
      let categoryFilter = cat;
      if (selectedCategories.length > 0) {
        categoryFilter = selectedCategories.join(',');
      }
      
      // Build advanced filter params
      const advancedParams = new URLSearchParams();
      advancedParams.append('minPrice', advancedFilters.priceRange[0]);
      advancedParams.append('maxPrice', advancedFilters.priceRange[1]);
      advancedParams.append('rating', advancedFilters.rating);
      advancedParams.append('sort', advancedFilters.sortBy);
      
      // Add dietary preferences
      if (advancedFilters.vegetarian) advancedParams.append('vegetarian', 'true');
      if (advancedFilters.vegan) advancedParams.append('vegan', 'true');
      if (advancedFilters.glutenFree) advancedParams.append('glutenFree', 'true');
      
      // Add spicy level
      if (advancedFilters.spicyLevel !== 'any') advancedParams.append('spicy', advancedFilters.spicyLevel);
      
      // Add special filters
      if (advancedFilters.discounted) advancedParams.append('discounted', 'true');
      if (advancedFilters.newlyAdded) advancedParams.append('new', 'true');
      if (advancedFilters.bestSeller) advancedParams.append('bestSeller', 'true');
      
      // Add price per serving filter
      if (advancedFilters.pricePerServing !== 'any') advancedParams.append('pricePerServing', advancedFilters.pricePerServing);
      
      // Add cuisine filters
      if (advancedFilters.cuisine && advancedFilters.cuisine.length > 0) {
        advancedParams.append('cuisine', advancedFilters.cuisine.join(','));
      }
      
      // Add delivery time filter
      if (advancedFilters.deliveryTime !== 'any') {
        advancedParams.append('deliveryTime', advancedFilters.deliveryTime);
      }
      
      // Pagination params
      advancedParams.append('page', page);
      advancedParams.append('limit', 10);
      
      // Update URL if needed
      if (updateUrl) {
        const params = new URLSearchParams();
        if (value) params.set('q', value);
        if (categoryFilter && categoryFilter !== 'All') params.set('category', categoryFilter);
        
        // Add all advanced filters to URL
        params.set('minPrice', advancedFilters.priceRange[0]);
        params.set('maxPrice', advancedFilters.priceRange[1]);
        params.set('rating', advancedFilters.rating);
        params.set('sort', advancedFilters.sortBy);
        
        if (advancedFilters.vegetarian) params.set('vegetarian', 'true');
        if (advancedFilters.vegan) params.set('vegan', 'true');
        if (advancedFilters.glutenFree) params.set('glutenFree', 'true');
        if (advancedFilters.spicyLevel !== 'any') params.set('spicy', advancedFilters.spicyLevel);
        if (advancedFilters.discounted) params.set('discounted', 'true');
        if (advancedFilters.newlyAdded) params.set('new', 'true');
        if (advancedFilters.bestSeller) params.set('bestSeller', 'true');
        if (advancedFilters.pricePerServing !== 'any') params.set('pricePerServing', advancedFilters.pricePerServing);
        if (advancedFilters.cuisine && advancedFilters.cuisine.length > 0) params.set('cuisine', advancedFilters.cuisine.join(','));
        if (advancedFilters.deliveryTime !== 'any') params.set('deliveryTime', advancedFilters.deliveryTime);
        
        const newUrl = `${location.pathname}?${params.toString()}`;
        window.history.pushState({}, '', newUrl);
        
        // Save search term to recent searches
        saveToRecentSearches(value);
      }
      
      const [userRes, postRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/v1/user/search?q=${encodeURIComponent(value)}`, { withCredentials: true }),
        axios.get(
          `${API_BASE_URL}/api/v1/post/search?q=${encodeURIComponent(value)}&category=${encodeURIComponent(categoryFilter)}&${advancedParams.toString()}`, 
          { withCredentials: true }
        ),
      ]);
      
      // If loading more results (pagination)
      if (page > 1) {
        setSearchResults(prev => ({
          users: prev.users,
          posts: [...prev.posts, ...(postRes.data.posts || [])]
        }));
      } else {
        setSearchResults({
          users: userRes.data.users || [],
          posts: postRes.data.posts || [],
        });
      }
      
      // Check if there are more pages of results
      setHasMoreResults(postRes.data.hasMore || false);
      setResultsPage(page);
      
      setShowDropdown(true);
      setIsSearching(false);
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults({ users: [], posts: [] });
      setShowDropdown(false);
      setIsSearching(false);
      toast.error("Failed to perform search");
    }
  };

  // Handle advanced filter changes
  const handleAdvancedFilterChange = (type, value) => {
    setAdvancedFilters(prev => ({
      ...prev,
      [type]: value
    }));
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      doSearch(searchTerm, category);
    }, 300);
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedCategories([]);
    setCategory("All");
    setAdvancedFilters({
      priceRange: [0, 2000],
      rating: 0,
      sortBy: "relevance",
      vegetarian: false,
      vegan: false,
      glutenFree: false,
      spicyLevel: "any",
      discounted: false,
      newlyAdded: false,
      bestSeller: false,
      pricePerServing: "any",
      cuisine: [],
      deliveryTime: "any"
    });
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      doSearch(searchTerm, "All");
    }, 100);
  };

  // Load more search results (pagination)
  const loadMoreResults = () => {
    if (hasMoreResults && !isSearching) {
      doSearch(searchTerm, category, false, resultsPage + 1);
    }
  };

  // Debounced search on input
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (value.trim() === '') {
      setShowRecentSearches(true);
      setShowDropdown(true);
    } else {
      setShowRecentSearches(false);
      searchTimeout.current = setTimeout(() => {
        doSearch(value, category);
      }, 300);
    }
  };

  // Search on category change
  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setCategory(newCategory);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      doSearch(searchTerm, newCategory);
    }, 100);
  };

  // Handle category chip selection
  const handleCategorySelect = (cat) => {
    // Toggle category selection
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
    
    // Update search results based on new selection
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      doSearch(searchTerm, category);
    }, 100);
  };

  // Show dropdown on focus
  const handleFocus = () => {
    if (searchTerm.trim() === '') {
      setShowRecentSearches(true);
      setShowDropdown(true);
    } else if (searchResults.users.length > 0 || searchResults.posts.length > 0) {
      setShowDropdown(true);
    }
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
  };

  // Use recent search
  const useRecentSearch = (term) => {
    setSearchTerm(term);
    setShowRecentSearches(false);
    doSearch(term, category, true);
  };

  // Clear recent searches
  const clearRecentSearches = (e) => {
    e.stopPropagation();
    localStorage.removeItem('recentSearches');
    setRecentSearches([]);
  };

  // Handle enter key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      doSearch(searchTerm, category, true);
    }
  };

  // Handle search form submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    doSearch(searchTerm, category, true);
  };

  const handleResultClick = (type, item) => {
    setShowDropdown(false);
    setSearchTerm("");
    setSearchResults({ users: [], posts: [] });
    if (type === "user") {
      navigate(`/profile/${item._id}`);
    } else if (type === "post") {
      navigate(`/post/${item._id}`);
    }
  };

  // Highlight matching text in search results
  const highlightMatch = (text, query) => {
    if (!query || !text) return text;
    try {
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<mark class="bg-yellow-200 rounded-sm">$1</mark>');
    } catch (e) {
      return text;
    }
  };

  const logoutHandler = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/user/logout`, {
        withCredentials: true,
      });
      if (res.data.success) {
        dispatch(setAuthUser(null));
        dispatch(setSelectedPost(null));
        dispatch(setPosts([]));
        navigate("/login");
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  };

  return (
    <header className="w-full flex flex-col md:flex-row items-center justify-between p-4 md:px-8 bg-white shadow-md gap-4">
      {/* Left Section: Logo and Title */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <img
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSlaBUr5bPvUZyj3Dh3afh1CXfuxPW0PWozOw&s"
          alt="Profile"
          className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover"
        />
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">
          FOOD HUB
        </h1>
      </div>

      {/* Center Section: Search Bar */}
      <div className="w-full md:w-1/2 relative">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-grow">
              <Search className="absolute top-1/2 left-4 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search for food, restaurants, or users..."
                className="w-full pl-12 pr-10 py-2.5 border rounded-full focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm md:text-base"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
              />
              {searchTerm && (
                <button 
                  type="button"
                  onClick={() => { 
                    setSearchTerm(''); 
                    setSearchResults({ users: [], posts: [] });
                  }}
                  className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            
            {/* <button
              type="button"
              data-filter-toggle="true"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 border rounded-full focus:outline-none ${showFilters ? 'bg-orange-100 border-orange-400' : 'bg-white'}`}
              aria-label="Toggle filters"
            >
              <Filter size={20} className={showFilters ? 'text-orange-500' : 'text-gray-400'} />
            </button> */}
            
            <p
              type="submit"
              className="px-4 py-2.5 mt-3 bg-orange-500 text-white font-medium rounded-sm hover:bg-orange-600 transition-colors hidden md:block"
            >
              Search
            </p>
          </div>
          
          {/* Advanced Filter Section */}
          {showFilters && (
            <div className="mt-2 p-4 bg-white border rounded-lg shadow-lg z-50" ref={filterRef}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Advanced Filters</h3>
                {(selectedCategories.length > 0 || advancedFilters.rating > 0 || 
                  advancedFilters.vegetarian || advancedFilters.vegan || advancedFilters.glutenFree ||
                  advancedFilters.spicyLevel !== 'any' || advancedFilters.discounted ||
                  advancedFilters.newlyAdded || advancedFilters.bestSeller ||
                  advancedFilters.pricePerServing !== 'any' || advancedFilters.cuisine.length > 0 ||
                  advancedFilters.deliveryTime !== 'any' ||
                  advancedFilters.priceRange[0] > 0 || advancedFilters.priceRange[1] < 2000) && (
                  <button 
                    onClick={clearFilters}
                    className="text-xs text-orange-500 hover:text-orange-700 font-medium"
                  >
                    Reset all filters
                  </button>
                )}
              </div>
              
              {/* Categories Section */}
              <div className="filter-section mb-4">
                <div 
                  className="filter-header flex items-center justify-between cursor-pointer mb-2"
                  onClick={() => toggleFilterSection('categories')}
                >
                  <h4 className="text-sm font-medium text-gray-700 flex items-center">
                    <Tag size={16} className="mr-2 text-orange-500" />
                    Categories
                  </h4>
                  <ChevronDown 
                    size={16} 
                    className={`transition-transform ${expandedFilterSections.categories ? 'rotate-180' : ''}`} 
                  />
                </div>
                
                <Collapse in={expandedFilterSections.categories}>
                  <div className="filter-content flex flex-wrap gap-2">
                    {categories.filter(cat => cat !== "All").map((cat) => (
                      <Chip 
                        key={cat}
                        label={cat}
                        size="small"
                        color={selectedCategories.includes(cat) ? "primary" : "default"}
                        onClick={() => handleCategorySelect(cat)}
                        className="cursor-pointer"
                      />
                    ))}
                  </div>
                </Collapse>
              </div>
              
              {/* Price Range Section */}
              <div className="filter-section mb-4">
                <div 
                  className="filter-header flex items-center justify-between cursor-pointer mb-2"
                  onClick={() => toggleFilterSection('price')}
                >
                  <h4 className="text-sm font-medium text-gray-700 flex items-center">
                    <Percent size={16} className="mr-2 text-orange-500" />
                    Price Range
                  </h4>
                  <ChevronDown 
                    size={16} 
                    className={`transition-transform ${expandedFilterSections.price ? 'rotate-180' : ''}`} 
                  />
                </div>
                
                <Collapse in={expandedFilterSections.price}>
                  <div className="filter-content">
                    <div className="flex justify-between mb-2">
                      <span className="text-xs text-gray-600">₹{advancedFilters.priceRange[0]}</span>
                      <span className="text-xs text-gray-600">₹{advancedFilters.priceRange[1]}</span>
                    </div>
                    <Slider
                      value={advancedFilters.priceRange}
                      onChange={(_, newValue) => handleAdvancedFilterChange('priceRange', newValue)}
                      min={0}
                      max={2000}
                      step={50}
                      size="small"
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => `₹${value}`}
                      aria-labelledby="price-range-slider"
                    />
                    
                    {/* Quick price range buttons */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Chip 
                        label="Budget (₹0-₹200)" 
                        size="small" 
                        onClick={() => handleAdvancedFilterChange('priceRange', [0, 200])}
                        color={advancedFilters.priceRange[0] === 0 && advancedFilters.priceRange[1] === 200 ? "primary" : "default"}
                      />
                      <Chip 
                        label="Mid (₹200-₹500)" 
                        size="small" 
                        onClick={() => handleAdvancedFilterChange('priceRange', [200, 500])}
                        color={advancedFilters.priceRange[0] === 200 && advancedFilters.priceRange[1] === 500 ? "primary" : "default"}
                      />
                      <Chip 
                        label="Premium (₹500+)" 
                        size="small" 
                        onClick={() => handleAdvancedFilterChange('priceRange', [500, 2000])}
                        color={advancedFilters.priceRange[0] === 500 && advancedFilters.priceRange[1] === 2000 ? "primary" : "default"}
                      />
                    </div>
                    
                    {/* Price per serving filter */}
                    <div className="mt-3">
                      <h5 className="text-xs font-medium text-gray-600 mb-1">Price per serving</h5>
                      <div className="flex flex-wrap gap-2">
                        {[
                          {value: 'any', label: 'Any'}, 
                          {value: 'low', label: 'Low (₹0-₹100 per serving)'},
                          {value: 'medium', label: 'Medium (₹100-₹250 per serving)'},
                          {value: 'high', label: 'High (₹250+ per serving)'}
                        ].map((option) => (
                          <Chip 
                            key={option.value}
                            label={option.label}
                            size="small"
                            color={advancedFilters.pricePerServing === option.value ? "primary" : "default"}
                            onClick={() => handleAdvancedFilterChange('pricePerServing', option.value)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </Collapse>
              </div>
              
              {/* Rating Section */}
              <div className="filter-section mb-4">
                <div 
                  className="filter-header flex items-center justify-between cursor-pointer mb-2"
                  onClick={() => toggleFilterSection('rating')}
                >
                  <h4 className="text-sm font-medium text-gray-700 flex items-center">
                    <Star size={16} className="mr-2 text-orange-500" />
                    Rating & Quality
                  </h4>
                  <ChevronDown 
                    size={16} 
                    className={`transition-transform ${expandedFilterSections.rating ? 'rotate-180' : ''}`} 
                  />
                </div>
                
                <Collapse in={expandedFilterSections.rating}>
                  <div className="filter-content">
                    <h5 className="text-xs font-medium text-gray-600 mb-1">Minimum Rating</h5>
                    <Rating
                      value={advancedFilters.rating}
                      onChange={(_, newValue) => handleAdvancedFilterChange('rating', newValue)}
                      precision={1}
                      size="small"
                    />
                    
                    {/* Special quality filters */}
                    <div className="mt-3">
                      <FormGroup>
                        <FormControlLabel 
                          control={
                            <Checkbox 
                              checked={advancedFilters.bestSeller}
                              onChange={(e) => handleAdvancedFilterChange('bestSeller', e.target.checked)}
                              size="small"
                            />
                          } 
                          label={<span className="text-xs">Best Sellers</span>}
                        />
                        <FormControlLabel 
                          control={
                            <Checkbox 
                              checked={advancedFilters.newlyAdded}
                              onChange={(e) => handleAdvancedFilterChange('newlyAdded', e.target.checked)}
                              size="small"
                            />
                          } 
                          label={<span className="text-xs">Newly Added</span>}
                        />
                        <FormControlLabel 
                          control={
                            <Checkbox 
                              checked={advancedFilters.discounted}
                              onChange={(e) => handleAdvancedFilterChange('discounted', e.target.checked)}
                              size="small"
                            />
                          } 
                          label={<span className="text-xs">Discounted Items</span>}
                        />
                      </FormGroup>
                    </div>
                  </div>
                </Collapse>
              </div>
              
              {/* Dietary Preferences Section */}
              <div className="filter-section mb-4">
                <div 
                  className="filter-header flex items-center justify-between cursor-pointer mb-2"
                  onClick={() => toggleFilterSection('dietary')}
                >
                  <h4 className="text-sm font-medium text-gray-700">Dietary & Spiciness</h4>
                  <ChevronDown 
                    size={16} 
                    className={`transition-transform ${expandedFilterSections.dietary ? 'rotate-180' : ''}`} 
                  />
                </div>
                
                <Collapse in={expandedFilterSections.dietary}>
                  <div className="filter-content">
                    {/* Dietary restrictions */}
                    <div className="mb-2">
                      <FormGroup row>
                        <FormControlLabel 
                          control={
                            <Checkbox 
                              checked={advancedFilters.vegetarian}
                              onChange={(e) => handleAdvancedFilterChange('vegetarian', e.target.checked)}
                              size="small"
                            />
                          } 
                          label={<span className="text-xs">Vegetarian</span>}
                        />
                        <FormControlLabel 
                          control={
                            <Checkbox 
                              checked={advancedFilters.vegan}
                              onChange={(e) => handleAdvancedFilterChange('vegan', e.target.checked)}
                              size="small"
                            />
                          } 
                          label={<span className="text-xs">Vegan</span>}
                        />
                        <FormControlLabel 
                          control={
                            <Checkbox 
                              checked={advancedFilters.glutenFree}
                              onChange={(e) => handleAdvancedFilterChange('glutenFree', e.target.checked)}
                              size="small"
                            />
                          } 
                          label={<span className="text-xs">Gluten-free</span>}
                        />
                      </FormGroup>
                    </div>
                    
                    {/* Spicy level */}
                    <div className="mb-2">
                      <h5 className="text-xs font-medium text-gray-600 mb-1">Spicy level</h5>
                      <div className="flex flex-wrap gap-2">
                        {['any', 'mild', 'medium', 'hot'].map((level) => (
                          <Chip 
                            key={level}
                            label={level === 'any' ? 'Any' : level.charAt(0).toUpperCase() + level.slice(1)}
                            size="small"
                            color={advancedFilters.spicyLevel === level ? "primary" : "default"}
                            onClick={() => handleAdvancedFilterChange('spicyLevel', level)}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Cuisine filters */}
                    <div className="mt-3">
                      <h5 className="text-xs font-medium text-gray-600 mb-1">Cuisine</h5>
                      <div className="flex flex-wrap gap-2">
                        {['Indian', 'Chinese', 'Italian', 'Mexican', 'Thai', 'Japanese'].map((cuisine) => (
                          <Chip 
                            key={cuisine}
                            label={cuisine}
                            size="small"
                            color={advancedFilters.cuisine.includes(cuisine) ? "primary" : "default"}
                            onClick={() => {
                              const newCuisines = advancedFilters.cuisine.includes(cuisine)
                                ? advancedFilters.cuisine.filter(c => c !== cuisine)
                                : [...advancedFilters.cuisine, cuisine];
                              handleAdvancedFilterChange('cuisine', newCuisines);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Delivery time */}
                    <div className="mt-3">
                      <h5 className="text-xs font-medium text-gray-600 mb-1">Delivery Time</h5>
                      <div className="flex flex-wrap gap-2">
                        {[
                          {value: 'any', label: 'Any time'},
                          {value: 'fast', label: 'Fast (< 30 mins)'},
                          {value: 'standard', label: 'Standard (30-60 mins)'}
                        ].map((option) => (
                          <Chip 
                            key={option.value}
                            label={option.label}
                            size="small"
                            color={advancedFilters.deliveryTime === option.value ? "primary" : "default"}
                            onClick={() => handleAdvancedFilterChange('deliveryTime', option.value)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </Collapse>
              </div>
              
              {/* Sort Section */}
              <div className="filter-section">
                <div 
                  className="filter-header flex items-center justify-between cursor-pointer mb-2"
                  onClick={() => toggleFilterSection('sort')}
                >
                  <h4 className="text-sm font-medium text-gray-700 flex items-center">
                    <SortAsc size={16} className="mr-2 text-orange-500" />
                    Sort Results
                  </h4>
                  <ChevronDown 
                    size={16} 
                    className={`transition-transform ${expandedFilterSections.sort ? 'rotate-180' : ''}`} 
                  />
                </div>
                
                <Collapse in={expandedFilterSections.sort}>
                  <div className="filter-content flex flex-wrap gap-2">
                    {[
                      {value: 'relevance', label: 'Relevance'},
                      {value: 'rating', label: 'Highest Rated'},
                      {value: 'price_low', label: 'Price: Low to High'},
                      {value: 'price_high', label: 'Price: High to Low'},
                      {value: 'date', label: 'Newest First'}
                    ].map((option) => (
                      <Chip 
                        key={option.value}
                        label={option.label}
                        size="small"
                        color={advancedFilters.sortBy === option.value ? "primary" : "default"}
                        onClick={() => handleAdvancedFilterChange('sortBy', option.value)}
                      />
                    ))}
                  </div>
                </Collapse>
              </div>
              
              {/* Apply filters button (visible on mobile) */}
              <div className="mt-4 md:hidden">
                <button
                  type="button"
                  onClick={() => {
                    doSearch(searchTerm, category, true);
                    setShowFilters(false);
                  }}
                  className="w-full py-2 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </form>
        
        {/* Search Results & Recent Searches Dropdown */}
        {showDropdown && (
          <div 
            ref={dropdownRef}
            className="absolute z-50 left-0 right-0 bg-white border rounded-lg shadow-lg mt-2 max-h-96 overflow-y-auto"
          >
            {/* Recent Searches */}
            {showRecentSearches && recentSearches.length > 0 && (
              <div className="border-b pb-2">
                <div className="sticky top-0 bg-gray-50 px-4 py-2 text-xs text-gray-500 font-semibold border-b flex justify-between items-center">
                  <span>Recent Searches</span>
                  <button 
                    onClick={clearRecentSearches}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Clear
                  </button>
                </div>
                {recentSearches.map((term, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-orange-50 cursor-pointer"
                    onClick={() => useRecentSearch(term)}
                  >
                    <Clock size={14} className="text-gray-400" />
                    <span className="text-sm">{term}</span>
                  </div>
                ))}
              </div>
            )}
            
            {isSearching ? (
              <div className="px-4 py-6 text-center">
                <div className="w-6 h-6 border-t-2 border-orange-500 border-solid rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-500 text-sm">Searching...</p>
              </div>
            ) : (
              <>
                {searchResults.users.length > 0 && (
                  <div>
                    <div className="sticky top-0 bg-gray-50 px-4 py-2 text-xs text-gray-500 font-semibold border-b">
                      Users ({searchResults.users.length})
                    </div>
                    {searchResults.users.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-orange-50 cursor-pointer"
                        onClick={() => handleResultClick("user", user)}
                      >
                        <Avatar src={user.profilePicture} alt={user.username} sx={{ width: 28, height: 28 }} />
                        <span 
                          className="text-sm"
                          dangerouslySetInnerHTML={{ 
                            __html: highlightMatch(user.username, searchTerm) 
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.posts.length > 0 && (
                  <div>
                    <div className="sticky top-0 bg-gray-50 px-4 py-2 text-xs text-gray-500 font-semibold border-b">
                      Food Posts ({searchResults.posts.length})
                    </div>
                    {/* Group posts by category */}
                    {Object.entries(
                      searchResults.posts.reduce((acc, post) => {
                        const category = post.category || "Other";
                        if (!acc[category]) acc[category] = [];
                        acc[category].push(post);
                        return acc;
                      }, {})
                    ).map(([category, posts]) => (
                      <div key={category}>
                        <div className="px-4 py-1 bg-gray-100 text-xs font-medium text-gray-600">
                          {category}
                        </div>
                        {posts.map((post) => (
                          <div
                            key={post._id}
                            className="flex items-center gap-2 px-4 py-2 hover:bg-orange-50 cursor-pointer border-b border-gray-100"
                            onClick={() => handleResultClick("post", post)}
                          >
                            {post.image && (
                              <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden">
                                <img src={post.image} alt="post" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p 
                                className="text-sm font-medium truncate max-w-xs"
                                dangerouslySetInnerHTML={{ 
                                  __html: highlightMatch(post.caption, searchTerm) 
                                }}
                              />
                              <div className="flex items-center text-xs text-gray-500 gap-2 flex-wrap">
                                <span>by {post.author?.username}</span>
                                {post.rating && (
                                  <span className="flex items-center">
                                    <Star size={12} className="text-yellow-400 fill-yellow-400 mr-0.5" />
                                    {post.rating}
                                  </span>
                                )}
                                {post.price && (
                                  <span className="font-medium text-orange-500">₹{post.price}</span>
                                )}
                                {post.discounted && (
                                  <span className="bg-green-100 text-green-700 text-[10px] px-1 py-0.5 rounded">
                                    OFFER
                                  </span>
                                )}
                                {post.bestSeller && (
                                  <span className="bg-orange-100 text-orange-700 text-[10px] px-1 py-0.5 rounded">
                                    BEST SELLER
                                  </span>
                                )}
                                {post.vegetarian && (
                                  <span className="flex items-center text-green-600">
                                    <span className="h-2 w-2 inline-block bg-green-600 rounded-full mr-1"></span>
                                    Veg
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                    
                    {/* Load more button */}
                    {hasMoreResults && (
                      <button
                        onClick={loadMoreResults}
                        className="w-full py-2 text-sm text-orange-500 hover:bg-orange-50 transition-colors"
                        disabled={isSearching}
                      >
                        {isSearching ? 'Loading...' : 'Load more results'}
                      </button>
                    )}
                  </div>
                )}

                {searchResults.users.length === 0 && searchResults.posts.length === 0 && !showRecentSearches && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-gray-500 text-sm mb-1">No results found</p>
                    <p className="text-gray-400 text-xs">Try different keywords or filters</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Section: Location and Buttons */}
      <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
        <div
          className="flex items-center gap-2 text-gray-600 cart-icon"
          onClick={() => navigate("/cartPage")}
          data-testid="cart-icon-container"
        >
          <Badge badgeContent={cartItems?.length || 0} color="secondary">
            <ShoppingCart className="cursor-pointer" data-testid="ShoppingCartIcon" />
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/profile/${user?._id}`}>
            <Avatar
              alt="User"
              src={user?.profilePicture}
              className="cursor-pointer"
            />
          </Link>

          <p
            onClick={logoutHandler}
            className="px-4 py-2 mt-3 text-sm font-semibold text-white bg-orange-500 rounded-sm hover:bg-orange-600 transition"
          >
            Logout
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;
