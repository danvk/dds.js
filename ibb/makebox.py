#!/usr/bin/env python

boxes = {
    'N': (2, 120, 730, 244),
    'S': (2, 1208, 730, 1332),
    'E': (668, 336, 746, 1038),
    'W': (2, 336, 80, 1038)
}
HEIGHT = 1334

print '''
// Card bounding boxes for iPhone 6 screen: 750x1334
// card -> [x1, y1, x2, y2]
var ibbBoxes6 = {
'''

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
        ix1 = round(x)
        iy1 = round(y)
        ix2 = round(x + w - 1)
        iy2 = round(y + h - 1)
        k = '%s%d' % (player, i)
        print '  %3s: [%4d, %4d, %4d, %4d],  // %d x %d' % (
                k, ix1, iy1, ix2, iy2, ix2 - ix1 + 1, iy2 - iy1 + 1)
    print

print '};'
