'use strict';

(function(root) {

  var oldRootDotDepend = root.$D;
  var exports = root.$D = {};



  /*
    Includes dependency-graph (dep_graph.js) for Node JS by Jim Riecken

    https://github.com/jriecken/dependency-graph/blob/master/LICENSE

    Copyright (C) 2013-2015 by Jim Riecken

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
  */
  var depGraphLib = exports.depGraphLib = {};
  (function(exports) {
    /**
     * A simple dependency graph
     */

    /**
     * Helper for creating a Depth-First-Search on
     * a set of edges.
     *
     * Detects cycles and throws an Error if one is detected.
     *
     * @param edges The set of edges to DFS through
     * @param leavesOnly Whether to only return "leaf" nodes (ones who have no edges)
     * @param result An array in which the results will be populated
     */
    function createDFS(edges, leavesOnly, result) {
      var currentPath = [];
      var visited = {};
      return function DFS(name) {
        visited[name] = true;
        currentPath.push(name);
        edges[name].forEach(function (edgeName) {
          if (!visited[edgeName]) {
            DFS(edgeName);
          } else if (currentPath.indexOf(edgeName) >= 0) {
            currentPath.push(edgeName);
            throw new Error('Dependency Cycle Found: ' + currentPath.join(' -> '));
          }
        });
        currentPath.pop();
        if ((!leavesOnly || edges[name].length === 0) && result.indexOf(name) === -1) {
          result.push(name);
        }
      };
    }

    /**
     * Simple Dependency Graph
     */
    var DepGraph = exports.DepGraph = function DepGraph() {
      this.nodes = {};
      this.outgoingEdges = {}; // Node name -> [Dependency Node name]
      this.incomingEdges = {}; // Node name -> [Dependant Node name]
    };
    DepGraph.prototype = {
      /**
       * Add a node to the dependency graph. If a node with the specified
       * name already exists, this method will do nothing.
       */
      addNode:function (name) {
        if (!this.hasNode(name)) {
          this.nodes[name] = name;
          this.outgoingEdges[name] = [];
          this.incomingEdges[name] = [];
        }
      },
      /**
       * Remove a node from the dependency graph. If a node with the specified
       * name does not exist, this method will do nothing.
       */
      removeNode:function (name) {
        if (this.hasNode(name)) {
          delete this.nodes[name];
          delete this.outgoingEdges[name];
          delete this.incomingEdges[name];
          [this.incomingEdges, this.outgoingEdges].forEach(function (edgeList) {
            Object.keys(edgeList).forEach(function (key) {
              var idx = edgeList[key].indexOf(name);
              if (idx >= 0) {
                edgeList[key].splice(idx, 1);
              }
            }, this);
          });
        }
      },
      /**
       * Check if a node exists in the graph
       */
      hasNode:function (name) {
        return !!this.nodes[name];
      },
      /**
       * Add a dependency between two nodes. If either of the nodes does not exist,
       * an Error will be thrown.
       */
      addDependency:function (from, to) {
        if (!this.hasNode(from)) {
          throw new Error('Node does not exist: ' + from);
        }
        if (!this.hasNode(to)) {
          throw new Error('Node does not exist: ' + to);
        }
        if (this.outgoingEdges[from].indexOf(to) === -1) {
          this.outgoingEdges[from].push(to);
        }
        if (this.incomingEdges[to].indexOf(from) === -1) {
          this.incomingEdges[to].push(from);
        }
        return true;
      },
      /**
       * Remove a dependency between two nodes.
       */
      removeDependency:function (from, to) {
        var idx;
        if (this.hasNode(from)) {
          idx = this.outgoingEdges[from].indexOf(to);
          if (idx >= 0) {
            this.outgoingEdges[from].splice(idx, 1);
          }
        }

        if (this.hasNode(to)) {
          idx = this.incomingEdges[to].indexOf(from);
          if (idx >= 0) {
            this.incomingEdges[to].splice(idx, 1);
          }
        }
      },
      /**
       * Get an array containing the nodes that the specified node depends on (transitively).
       * If `leavesOnly` is true, only nodes that do not depend on any other nodes will be returned
       * in the array.
       */
      dependenciesOf:function (name, leavesOnly) {
        if (this.hasNode(name)) {
          var result = [];
          var DFS = createDFS(this.outgoingEdges, leavesOnly, result);
          DFS(name);
          var idx = result.indexOf(name);
          if (idx >= 0) {
            result.splice(idx, 1);
          }
          return result;
        }
        else {
          throw new Error('Node does not exist: ' + name);
        }
      },
      /**
       * get an array containing the nodes that depend on the specified node (transitively).
       * If `leavesOnly` is true, only nodes that do not have any dependants will be returned in the array.
       */
      dependantsOf:function (name, leavesOnly) {
        if (this.hasNode(name)) {
          var result = [];
          var DFS = createDFS(this.incomingEdges, leavesOnly, result);
          DFS(name);
          var idx = result.indexOf(name);
          if (idx >= 0) {
            result.splice(idx, 1);
          }
          return result;
        } else {
          throw new Error('Node does not exist: ' + name);
        }
      },
      /**
       * Construct the overall processing order for the dependency graph.
       * If `leavesOnly` is true, only nodes that do not depend on any other nodes will be returned.
       */
      overallOrder:function (leavesOnly) {
        var self = this;
        var result = [];
        var DFS = createDFS(this.outgoingEdges, leavesOnly, result);
        var keys = Object.keys(this.nodes);
        if (keys.length === 0) {
          return result; // Empty graph
        } else {
          keys.filter(function (node) {
            return self.incomingEdges[node].length === 0;
          }).forEach(function (n) {
            DFS(n);
          });
          if (result.length === 0) {
            // There's definitely a cycle somewhere - run the DFS on the first node
            // so that it constructs the cycle and reports it.
            DFS(keys[0]);
          }
          return result;
        }
      }
    };
  })(depGraphLib);



  var graph;
  var aliases; // consider: implement aliases as special graph nodes which get ignored for ordered output



  /**
   * Initialise this module.
   * - Reset state
   * - addDependency() every key-value pair in config.deps
   * - addAlias() every key-value pair in config.aliases
   */
  exports.init = function(config) {
    graph = new depGraphLib.DepGraph();
    aliases = {};

    var key;

    if (typeof config === 'undefined') {
      config = {};
    }
    if (typeof config.aliases === 'object') {
      for (key in config.aliases) {
        if (config.aliases.hasOwnProperty(key)) {
          addAlias(key, config.aliases[key]);
        }
      }
    }
    if (typeof config.deps === 'object') {
      for (key in config.deps) {
        if (config.deps.hasOwnProperty(key)) {
          addDependency(key, config.deps[key]);
        }
      }
    }
  };

  /**
   * Restores e.g. window.$D to its original state, and returns
   * a reference to this module which you can assign to a namespace
   * of your choice.
   * @returns {{}}
   */
  exports.noConflict = function() {
    root.$D = oldRootDotDepend;
    return exports;
  };

  /**
   * Used to treat single strings and arrays of strings interchangeably.
   * If the argument is an array, returns the argument.
   * If the argument is a string, returns a single-element Array containing the argument.
   * @param stringOrArray
   * @returns {Array}
   */
  var ensureStringOrArrayIsArray = function(stringOrArray) {
    if (stringOrArray instanceof Array) {
      return stringOrArray;
    }
    if (typeof stringOrArray === 'string') {
      return [stringOrArray];
    }
    throw new TypeError('Expected string or Array, but received ' + typeof stringOrArray);
  };

  /**
   * Registers a one-way alias.
   * @param jsFrom
   * @param jsTo
   */
  var addAlias = exports.addAlias = function(jsFrom, jsTo) {
    if (typeof jsFrom !== 'string' || typeof jsTo !== 'string') {
      throw new TypeError('Expected both arguments to be strings, but received ' + typeof jsFrom + ', ' + typeof jsTo);
    }
    aliases[jsFrom] = jsTo;
  };

  /**
   * Completely resolves an alias for a JavaScript, including aliases-of-aliases
   * @type {Function}
   */
  var resolveAlias = exports.resolveAlias = function(alias) {
    if (aliases.hasOwnProperty(alias)) {
      return resolveAlias(aliases[alias]);
    }
    return alias;
  };

  /**
   * Is this JavaScript reference equal to another once you factor
   * in the aliases?
   */
  var aliasEquals = exports.aliasEquals = function(alias1, alias2) {
    return resolveAlias(alias1) === resolveAlias(alias2);
  };

  /**
   * Declares that a JavaScript depends on one or more other JavaScripts
   * @param jsDependerName
   * @param jsDependeeNameOrNames
   */
  var addDependency = exports.addDependency = function(dependerAlias, dependeeAliasOrAliases) {
    var dependeeAliases = ensureStringOrArrayIsArray(dependeeAliasOrAliases);
    var depender = resolveAlias(dependerAlias);
    if (!graph.hasNode(depender)) {
      graph.addNode(depender);
    }
    dependeeAliases.forEach(function(dependeeAlias) {
      var dependee = resolveAlias(dependeeAlias);
      if (!graph.hasNode(dependee)) {
        graph.addNode(dependee);
      }
      graph.addDependency(depender, dependee);
    });
  };

  /**
   * Returns the intersection of array1 and array2, preserving order from array1
   * @param array1
   * @param array2
   * @returns {*}
   */
  var intersectionOfArrays = exports._intersectionOfArrays = function(array1, array2) {
    return array1.filter(function (elFromArray1) {
      return array2.indexOf(elFromArray1) !== -1;
    });
  };

  /**
   * Returns array1 excluding array2, preserving order from array1
   * @param array1
   * @param array2
   */
  var exclusionOfArrays = exports._exclusionOfArrays = function(array1, array2) {
    return array1.filter(function (elFromArray1) {
      return array2.indexOf(elFromArray1) === -1;
    });
  };

  /**
   * Returns union of array1 and array2, preserving order of array1, then array2
   * @param array1
   * @param array2
   * @returns {Array}
   */
  var unionOfArrays = exports._unionOfArrays = function(array1, array2) {
    return array1.concat(exclusionOfArrays(array2, array1));
  };

  /**
   * Returns a list of all dependencies of startingPointAlias, in
   * the correct execution order as implied by the dependency graph.
   *
   * @param startingPointAlias
   * @returns {Array}
   */
  var orderedDependenciesOf = function(startingPointAlias) {
    var orderedDeps = graph.overallOrder();
    var startingPoint = resolveAlias(startingPointAlias);
    var depsOfStartingPoint = graph.dependenciesOf(resolveAlias(startingPoint));

    return intersectionOfArrays(orderedDeps, depsOfStartingPoint);
  };

  var renderScriptTag = function(scriptPath) {
    return '<script src="' + scriptPath + '"></script>';
  };

  var isDepJavaScript = function(dep) {
    return dep.match(/\.js$/) !== null;
  };

  /**
   * Returns all JS dependencies starting from startingPointAlias, in
   * the correct execution order as implied by the dependency graph.
   *
   * @returns {string}
   */
  exports.orderedJsDependenciesOf = function(startingPointAlias, options) {
    var orderedDeps = orderedDependenciesOf(startingPointAlias);
    var depsOfAllExcludedStartingPoints = [];

    var excludingStartingPointAliasOrAliases = options && options.excluding;

    if (typeof excludingStartingPointAliasOrAliases !== 'undefined') {
      var excludingStartingPoints = ensureStringOrArrayIsArray(excludingStartingPointAliasOrAliases).map(
        function (alias) { return resolveAlias(alias); }
      );
      depsOfAllExcludedStartingPoints = excludingStartingPoints.reduce(function (accumulator, currentStartingPoint) {
        return unionOfArrays(accumulator, orderedDependenciesOf(currentStartingPoint))
      }, []);
    }

    return orderedDeps.filter(function(dep) { return isDepJavaScript(dep) && depsOfAllExcludedStartingPoints.indexOf(dep) === -1 });
  };

  exports.renderAsScriptTags = function(orderedJsDeps) {
    return orderedJsDeps.map(function(dep) { return renderScriptTag(dep); }).join('\n');
  };

})(window || this);
