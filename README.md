Online Starmap for The Ur-Quan Masters
======================================

This is a  web app that displays the starmap from "The Ur-Quan Masters"
(hereafter UQM), the modern port of the classic game "Star Control II".

The data in this application comes from the source code from UQM and from
the UQM Starmap Viewer, and both the contributors to those projects and the
legendary creators of the original game have my thanks.

Licensing stuff
---------------

This application uses and requires copies of jQuery, RequireJS, and
KnockoutJS, all of which I'm using under the terms of the MIT
license.  There are also images and data incorporated in this
application that are derived or taken from other works.  This
application is licensed to you under the terms of the GPL
version 2. See the file COPYING for more information about all of this.

Features
--------

    - Interact with the map to find out the name, position, size,
    color, and mineral and biological wealth of star systems.
    Just mouseover on platforms that have mice or similar pointing
    devices.

    - Zoom and pan the map.

    - [TODO] Search for stars by name

    - [TODO] Recast the map with stars sized by mineral wealth or biological
    wealth instead of actual size (dwarf, giant, super giant) and see what's
    near you that's worth visiting.

    - [TODO] More!

Build dependencies
------------------

If you're going to build this app yourself, you need to put copies of
jquery, requirejs, and knockout into the www/thirdparty directory, or
change the app source code to load them from CDNs as desired.

Author
------

Lebbeous Fogle-Weekley
Email: lebbeous+starmap@gmail.com
February 2015
