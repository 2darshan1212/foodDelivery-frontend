import React, { useRef } from "react";
import "./Categories.css"; // Import the CSS for custom scrollbar
import { useNavigate } from "react-router-dom";
import { dispatch } from "./../../../node_modules/react-hot-toast/src/core/store";
import { useDispatch } from "react-redux";
import { setSelectedCategory } from "../../redux/categorySlice";

const categories = [
  {
    id: 1,
    name: "Breakfast",
    image:
      "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?crop=entropy&cs=tinysrgb&fit=crop&w=200&q=60",
  },
  {
    id: 2,
    name: "Lunch",
    image:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?crop=entropy&cs=tinysrgb&fit=crop&w=200&q=60",
  },
  {
    id: 3,
    name: "Dinner",
    image:
      "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?crop=entropy&cs=tinysrgb&fit=crop&w=200&q=60",
  },
  {
    id: 4,
    name: "Fast Food",
    image:
      "https://thumbs.dreamstime.com/b/unhealthy-fast-food-delivery-menu-featuring-assorted-burgers-cheeseburgers-nuggets-french-fries-soda-high-calorie-low-356045884.jpg",
  },
  {
    id: 5,
    name: "Desserts",
    image:
      "https://images.unsplash.com/photo-1551024601-bec78aea704b?crop=entropy&cs=tinysrgb&fit=crop&w=200&q=60",
  },
  {
    id: 6,
    name: "Drinks",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTArZJd6sOfHgSGnh8ZCAQM3WSMTzmqAC--xQ&s",
  },
  {
    id: 7,
    name: "Snacks",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrs6NpuNDkZDqyflqs7qSC31H88XYD3OZaeQ&s",
  },
];

const Category = () => {
  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const scroll = (direction) => {
    const { current } = scrollRef;
    if (current) {
      const scrollAmount = direction === "left" ? -250 : 250;
      current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleCategoryClick = (category) => {
    // Navigate to the category page with the selected category
    // and set the selected category in the Redux store
    dispatch(setSelectedCategory(category));
    navigate(`/category/${category.name}`, { state: { category } });
  };

  return (
    <section className="py-8 px-4 relative">
      <h2 className="text-2xl font-bold mb-10 ">Categories</h2>

      {/* Scroll Buttons */}
      <div className="hidden md:flex mt-1 absolute right-6 top-4 z-10 gap-2">
        <button
          onClick={() => scroll("left")}
          className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition"
        >
          ◀️
        </button>
        <button
          onClick={() => scroll("right")}
          className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition"
        >
          ▶️
        </button>
      </div>

      {/* Scrollable Categories */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto gap-5 scroll-smooth snap-x snap-mandatory px-1 pb-2 relative custom-scrollbar"
      >
        {categories.map((category) => (
          <div
            key={category.id}
            onClick={() => handleCategoryClick(category)}
            className="flex-shrink-0 flex flex-col items-center p-3 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer w-32 snap-center group"
          >
            <div className="w-20 h-20 rounded-full overflow-hidden mb-2 border-2 border-transparent group-hover:border-orange-400 transition">
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-sm font-semibold text-gray-700 text-center">
              {category.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Category;
