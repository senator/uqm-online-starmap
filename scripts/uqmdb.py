#!/usr/bin/env python

import sys
import MySQLdb
import json

DB_OPTS = {
    "user"  : "uqm",
    "db"    : "uqm",
    "passwd": "uqm",
    "host"  : "localhost"
}

def prep_planet(row):
    return [
            int(row[0]), row[1], row[2], int(row[3]),
            int(row[4]), int(row[5]), int(row[6]), int(row[7]),
            row[8:16]
        ]

if __name__ == "__main__":
    cur = MySQLdb.connect(**DB_OPTS).cursor()

    cur.execute("SELECT sid - 591, pname, ptype, tectonics, weather, " +
        "temp, gravity, bio_danger / 2, min_common, min_corrosive, min_base, " +
        "min_noble, min_rare, min_precious, min_radio, min_exotic " +
        "FROM planet ORDER BY sid")

    json.dump(map(prep_planet, cur.fetchall()), sys.stdout)
