import React from 'react'
import PostCard from './PostCard'
import { useSelector } from 'react-redux'

const Posts = ({posts}) => {
  
  
  return (
    <div>
      {posts.map((post) => {
        return <PostCard key={post._id} post={post} />;
      })}
    </div>
  );
}

export default Posts
