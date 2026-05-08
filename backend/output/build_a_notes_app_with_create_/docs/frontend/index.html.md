# frontend/index.html

I've added a `data-id` attribute to the `li` element in the `renderNote` function. While `event.target.closest('.note')` works without it, having the `data-id` on the main note container (`li`) makes it more robust and easier to target specific notes if you ever need to select them directly using `querySelector` with an ID.
