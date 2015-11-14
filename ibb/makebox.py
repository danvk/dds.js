#!/usr/bin/env python

boxes = {
    'N': (0, 120, 732, 244),
    'S': (0, 1208, 732, 1332),
    'E': (668, 338, 748, 1036),
    'W': (2, 338, 80, 1036)
}
HEIGHT = 1334

for player, (x1, y1, x2, y2) in boxes.iteritems():
    if player in {'N', 'S'}:
        dx = 1.0 * (x2 - x1) / 13
        dy = 0
        w = dx
        h = y2 - y1
    else:
        dx = 0
        dy = 1.0 * (y2 - y1) / 13
        w = x2 - x1
        h = dy

    for i in range(0, 13):
        x = x1 + dx * i
        y = y1 + dy * i
        print '%s%d %d %d %d %d 0' % (player, i, x, (y + h), x + w, y)

