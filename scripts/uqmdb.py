#!/usr/bin/env python

"""
This script is designed to connect to the database of the UQM StarMap Viewer
and read all the rows of its "planet" table in order to build (and write
to stdout) a JSON representation of all the worlds in the game, for my use
in my webapp.
"""

import sys
import MySQLdb
import json

DB_OPTS = {
    "user"  : "uqm",
    "db"    : "uqm",
    "passwd": "uqm",
    "host"  : "localhost"
}
WORLD_NAMES_PATH = "./world_names_in_db.json"
WORLD_TYPES_PATH = "../data/world_types.json"

def shear(v):
    del v[15]

def is_planet(v):
    return not v[15]

def open_moon_list(v):
    if len(v) > 15:
        return
    else:
        v.append([])

def add_to_moons(p, v):
    p[15].append(v)

class Processor(object):
    def __init__(self, names_path, types_path):
        self.world_names = json.load(open(names_path, "r"))
        self.world_types = json.load(open(types_path, "r"))

    def dump_all(self, cur):
        P = {}
        working_planet = None

        for row in cur.fetchall():
            k, v = self.prep_planet(row)
            if is_planet(v):
                shear(v)
                working_planet = v
                if k not in P:
                    P[k] = []
                P[k].append(v)
            else:
                shear(v)
                open_moon_list(working_planet)
                add_to_moons(working_planet, v)

        json.dump(P, sys.stdout, indent=2)

    def wtype(self, key):
        return self.world_types.index(key)

    def name(self, key):
        result = 0
        try:
            result = self.world_names.index(key)
        except ValueError:
            pass

        return result

    def prep_planet(self, row):
        k = int(row[0])
        v = [self.name(row[1]), self.wtype(row[2])]
        v.extend(map(int, row[3:16]))
        v.append(bool(row[16]))
        return (k, v)

if __name__ == "__main__":
    pro = Processor(WORLD_NAMES_PATH, WORLD_TYPES_PATH)
    cur = MySQLdb.connect(**DB_OPTS).cursor()

    cur.execute("SELECT sid - 591, pname, ptype, tectonics, weather, " +
        "temp, gravity, bio_danger / 2, min_common, min_corrosive, min_base, " +
        "min_noble, min_rare, min_precious, min_radio, min_exotic, " +
        "pname LIKE '%Moon%' AS is_moon " +
        "FROM planet ORDER BY sid,pid")

    pro.dump_all(cur)
