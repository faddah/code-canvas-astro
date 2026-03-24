"""
Matrix rain animation using the curses library.

Renders a terminal-based "Matrix" digital rain effect by continuously printing
random alphanumeric characters in green on a black background, with columns
that randomly reset to the top of the screen to simulate falling streams.
"""

import curses
import random
import time


def draw_matrix(stdscr):
    """Draw a continuous Matrix-style digital rain animation in the terminal.

    Initializes green-on-black color output, hides the cursor, and enters an
    infinite loop that prints random alphanumeric characters column by column.
    Each column advances downward until it reaches the bottom of the screen or
    randomly resets to the top (with a 5% chance per frame), creating the
    cascading rain effect.

    Args:
        stdscr: A curses window object provided by curses.wrapper(), representing
            the full terminal screen.
    """
    curses.curs_set(0)
    curses.start_color()
    curses.init_pair(1, curses.COLOR_GREEN, curses.COLOR_BLACK)

    max_y, max_x = stdscr.getmaxyx()
    columns = [0] * max_x

    while True:
        for i, col_pos in enumerate(columns):
            char = random.choice("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ")
            try:
                stdscr.addstr(col_pos, i, char, curses.color_pair(1))
            except curses.error:
                pass

            if col_pos >= max_y - 1 or random.random() > 0.95:
                columns[i] = 0
            else:
                columns[i] += 1

        stdscr.refresh()
        time.sleep(0.1)


curses.wrapper(draw_matrix)
