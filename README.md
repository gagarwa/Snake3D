# NC State University
## CSC 461 - Computer Graphics

### Program 5 - 3D Snake
### Author - Gitesh Agarwal (gagarwa)

## Notes & Assumptions

### Part 1: Texturing
The texture to image mapping is upside down and/or backwards, which I corrected by flipping the image.

### Part 2: Light & Texture Blending
I performed three texture and lighting modulations:
1. Texture Only
2. Texture & Lighting (for color only)
3. Texture & Lighting (for color and alpha)

### Part 3: Transparency
I use 1.0 as the alpha border between transparent vs. opaque objects.  So, all translucent objects are considered transparent.

### Part 4: Depth Sorting
I do not support changes in triangle depth due to rotation, only translation.

## Extra Credit

### Render Ellipsoids (1%)
My program renders ellipsoids (enabled by default).  The texture mapping for ellipsoids may not appear smooth due to selecting a low resolution parameterization for my algorithm (for the sake of efficiency).  The texture mapping is also slightly different than the TA's version due to my implementation.

### Transparent Textures (1%)
My program supports transparent textures.
