# NC State University
## CSC 461 - Computer Graphics

### Program 5 - 3D Snake
### Author - Gitesh Agarwal (gagarwa)

## Notes & Assumptions

### Browser Support - Firefox
This program was only thoroughly tested in Firefox.  The basic mechanics, however, should work in every browser.  Also, please note that in order to work properly, this program may require **CORS** to be enabled in the browser.  In Google Chrome, you may also need to enable the "Allow File Access From Files" option.

### Viewing Perspective
As in the previous assignments, viewing transforms are supported in this program.  However, the key combinations were changed to the original model transform key combinations in the third assignment.  To change the view, you can use the following key combinations:

1. k and ; — translate view left and right along view X
2. o and l — translate view forward and backward along view Z
3. i and p — translate view up and down along view Y
4. K and : — rotate view left and right around view Y (yaw)
5. O and L — rotate view forward and backward around view X (pitch)
6. I and P — rotate view clockwise and counterclockwise around view Z (roll)

### Player Snake
The player controls the green snake by using the arrow keys.

## Extra Credit

### Track & Display Score (1%)
This program tracks and displays both the player's and the AI's (or second player's) score.  This can be found directly on the gameplay screen.

### Two-Player Mode (3%)
This program supports two-player mode.  The second player can take control of the AI snake (gray snake) at any time by using the WASD keys.  Until then, and after the player is killed and the snake respawns, the snake is controlled by the system AI.
