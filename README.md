# Snake 3D

## Description
A simple 3D snake game available [here](https://gagarwa.github.io/Snake3D/), where you can use the arrow keys to move your snake. Designed and built for a graphics course at NC State University.

### Browser Support - Firefox
This program was only thoroughly tested in Firefox.  The basic mechanics, however, should work in every browser.  Running locally, please note that in order to work properly, this program may require **CORS** to be enabled in the browser.  In Google Chrome, this means enabling the "Allow File Access From Files" option.

### License
The source code for this game is licensed under the [MIT License](https://mit-license.org/).  The images are the property of their respective owners, only provided for educational use.

## Gameplay

### Player Snake
The player controls the green snake by using the arrow keys.

### Two-Player Mode
This program supports two-player mode.  The second player can take control of the AI snake (gray snake) at any time by using the WASD keys.  Until then, and after the player is killed and the snake respawns, the snake is controlled by the AI system.

### Score
This program tracks and displays both the player's and the AI's (or second player's) score.  The score is reset for the respective player when their snake respawns.

### Viewing Perspective
In this game, you can transform the view to better fit your playing style.  To change the view, you can use the following key combinations:

1. k and ; — translate view left and right along view X
2. o and l — translate view forward and backward along view Z
3. i and p — translate view up and down along view Y
4. K and : — rotate view left and right around view Y (yaw)
5. O and L — rotate view forward and backward around view X (pitch)
6. I and P — rotate view clockwise and counterclockwise around view Z (roll)

## Credits
This program was originally written for the *Computer Graphics (CSC 461)* course at *NC State University*.  The project description was provided by Professor Benjamin Watson.
