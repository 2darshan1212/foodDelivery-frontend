import React, { useState, useEffect } from 'react'
import Category from '../category/Category'
import useGetAllPost from '../../hooks/useGetAllPost';
import Posts from '../post/posts'
import { useSelector } from 'react-redux';

const Feeds = () => {
  const { posts } = useSelector((state) => state.post);
  const { user } = useSelector((state) => state.auth);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [displayedPosts, setDisplayedPosts] = useState([]);
  
  useGetAllPost();
  
  // Listen for URL changes and search params
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const favorites = searchParams.get('favorites') === 'true';
    setShowOnlyFavorites(favorites);
  }, [window.location.search]);
  
  // Filter posts based on favorites flag
  useEffect(() => {
    if (showOnlyFavorites && user?.bookmarks?.length > 0) {
      const favoritePosts = posts.filter(post => user.bookmarks.includes(post._id));
      setDisplayedPosts(favoritePosts);
    } else {
      setDisplayedPosts(posts);
    }
  }, [showOnlyFavorites, posts, user?.bookmarks]);
  
  return (
    <>
      <main className="flex-1 lg:w-[250px] md:w-[400px] bg-gray-50 p-4 rounded-lg shadow-md">
        <Category />
        {showOnlyFavorites && (
          <div className="mb-4 p-3 bg-orange-50 rounded-md text-orange-500 font-medium flex justify-between items-center">
            <h2>Showing your favorites</h2>
            <button 
              onClick={() => {
                setShowOnlyFavorites(false);
                // Update URL without favorites parameter
                const url = new URL(window.location);
                url.searchParams.delete('favorites');
                window.history.pushState({}, '', url);
              }}
              className="text-sm bg-white px-2 py-1 rounded hover:bg-gray-100"
            >
              Show all
            </button>
          </div>
        )}
        {showOnlyFavorites && displayedPosts.length === 0 && (
          <div className="text-center p-8 text-gray-500">
            <p className="mb-2">You haven't added any favorites yet!</p>
            <p className="text-sm">Add posts to your favorites by clicking the bookmark icon or using the menu.</p>
          </div>
        )}
        <Posts posts={displayedPosts} />
      </main>
    </>
  );
}

export default Feeds
