import test from 'node:test';
import assert from 'node:assert/strict';
import {bendDirection} from '../src/route-hints.js';
import {angle} from '../src/math.js';
test('yaw changes follow the left/right input convention including wraparound',()=>{
 assert.equal(bendDirection(.25),'左');
 assert.equal(bendDirection(-.25),'右');
 assert.equal(bendDirection(angle(-3.05-3.05)),'左');
 assert.equal(bendDirection(angle(3.05-(-3.05))),'右');
});
