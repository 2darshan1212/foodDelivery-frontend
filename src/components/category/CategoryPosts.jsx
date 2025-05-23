import React from "react";
import PostCard from "../post/PostCard";


const CategoryPosts = ({ posts, category }) => {
  const filteredPosts = category
    ? posts.filter((post) => post.category === category)
    : posts;

  return (
    <div>
      {filteredPosts.map((post) => (
        <PostCard key={post._id} post={post} />
      ))}
    </div>
  );
};

export default CategoryPosts;
