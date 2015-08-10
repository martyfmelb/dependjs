'use strict';

require('./depend.js');

describe('depend library', function() {
  it('should add $D to the root namespace', function () {
    expect($D).to.be.an('object');
  });
});

describe('noConflict()', function() {
  it('should revert $D upon $D.noConflict and return a reference to the depend library', function() {
    var dependLib = $D;
    var noConflictReturnValue = $D.noConflict();
    expect($D).to.equal(undefined);
    expect(noConflictReturnValue).to.equal(dependLib);

    // teardown
    $D = dependLib;
  });
});

describe('init()', function() {
  it('should not throw an error if invoked without a config object', function() {
    expect(function() {
      $D.init();
    }).to.not.throw(Error);
  });

  it('should reset dependencies', function() {
    $D.init({ deps: { 'a.js': 'b.js' } });
    $D.init({ deps: { 'a.js': 'c.js' } });
    expect($D.orderedJsDependenciesOf('a.js')).to.have.members(['c.js']);
    expect($D.orderedJsDependenciesOf('a.js')).to.not.have.members(['b.js']);
  });

  it('should reset aliases', function() {
    $D.init({
      aliases: { 'a.js': 'a-resolved.js' },
      deps: { 'page': 'a.js' }
    });
    $D.init({
      deps: { 'page': 'a.js' }
    });
    expect($D.orderedJsDependenciesOf('page')).to.not.have.members(['a-resolved.js']);
  });
});

describe('addAlias()', function() {
  it('should throw an error if either of its 2 parameters are not strings', function() {
    $D.init();
    expect(function() { $D.addAlias(); }).to.throw(TypeError);
    expect(function() { $D.addAlias('a.js'); }).to.throw(TypeError);
    expect(function() { $D.addAlias('a.js', 69); }).to.throw(TypeError);
    expect(function() { $D.addAlias('a.js', null); }).to.throw(TypeError);
    expect(function() { $D.addAlias('a.js', undefined); }).to.throw(TypeError);
    expect(function() { $D.addAlias('a.js', ['b.js', 'c.js']); }).to.throw(TypeError);
    expect(function() { $D.addAlias(69, 'b.js'); }).to.throw(TypeError);
    expect(function() { $D.addAlias(null, 'b.js'); }).to.throw(TypeError);
    expect(function() { $D.addAlias(undefined, 'b.js'); }).to.throw(TypeError);

    // This might be supported in future
    expect(function() { $D.addAlias(['a.js', 'b.js'], 'c.js'); }).to.throw(TypeError);
  });
});

describe('addAlias()', function() {
  it('should resolve from source to target', function() {
    $D.init();
    $D.addAlias('a.js', 'a-resolved.js');
    expect($D.resolveAlias('a.js')).to.equal('a-resolved.js');
  });

  it('should resolve from source to target even if source or target does not end in .js', function() {
    $D.init();
    $D.addAlias('a', 'a.js');
    $D.addAlias('b.js', 'b');
    expect($D.resolveAlias('a')).to.equal('a.js');
    expect($D.resolveAlias('b.js')).to.equal('b');
  });

  it('should only resolve forward, not backward', function() {
    $D.init();
    $D.addAlias('a.js', 'a');
    expect($D.resolveAlias('a')).to.not.equal('a.js');
    expect($D.resolveAlias('a')).to.equal('a');
  });

  it('should be transitive', function() {
    $D.init();
    $D.addAlias('a', 'b');
    $D.addAlias('b', 'c');
    expect($D.resolveAlias('a')).to.equal('c');
  });
});

describe('addDependency()', function() {
  it('should throw an error if its dependee parameter is not a string nor an array', function() {
    $D.init();
    expect(function() { $D.addDependency('a', 69); }).to.throw(TypeError);
    expect(function() { $D.addDependency('a', null); }).to.throw(TypeError);
    expect(function() { $D.addDependency('a', undefined); }).to.throw(TypeError);
    expect(function() { $D.addDependency('a', {'b.js': 'c.js'}); }).to.throw(TypeError);
  });
});

describe('orderedJsDependenciesOf()', function() {
  it('should cause an error if a cyclic dependency is detected', function() {
    $D.init({
      deps: { 'a.js': 'b.js', 'b.js': 'c.js', 'c.js': 'a.js' }
    });
    expect(function() {
      return $D.orderedJsDependenciesOf('a.js');
    }).to.throw(Error);
  });

  it('should get a trivial single-level-deep ordering correct', function() {
    $D.init({ deps: {
      'page': 'depends-on-a.js',
      'depends-on-a.js': 'a.js'
    }});
    var orderedJsDeps = $D.orderedJsDependenciesOf('page');
    expect(orderedJsDeps.indexOf('a.js')).to.be.below(orderedJsDeps.indexOf('depends-on-a.js'));
  });

  it('should get a multiple-levels-deep ordering correct', function() {
    $D.init({ deps: {
      'page': 'depends-on-thing-that-depends-on-a.js',
      'depends-on-thing-that-depends-on-a.js': 'depends-on-a.js',
      'depends-on-a.js': 'a.js'
    }});
    var orderedJsDeps = $D.orderedJsDependenciesOf('page');
    expect(orderedJsDeps.indexOf('a.js')).to.be.below(orderedJsDeps.indexOf('depends-on-a.js'));
    expect(orderedJsDeps.indexOf('depends-on-a.js')).to.be.below(orderedJsDeps.indexOf('depends-on-thing-that-depends-on-a.js'));
  });

  it('should omit any dependencies not ending in .js', function() {
    $D.init({ deps: {
      'page': 'component',
      'component': ['jquery.js', 'underscore.js', 'backbone.js', 'component.css']
    }});
    var orderedJsDeps = $D.orderedJsDependenciesOf('page');
    expect(orderedJsDeps).to.not.have.members(['page', 'component', 'component.css']);
    expect(orderedJsDeps).to.have.members(['jquery.js', 'underscore.js', 'backbone.js']);
  });

  it('should resolve aliases in a multiple-levels-deep graph and get the ordering correct', function() {
    $D.init({
      aliases: {
        'jquery': 'jquery.js',
        'backbone': 'backbone.js',
        'underscore': 'underscore.js',
        'my-backbone-app': 'my-backbone-app.js'
      },
      deps: {
        'backbone': 'underscore',
        'my-backbone-app': ['backbone', 'jquery']
      }
    });
    $D.addDependency('page', 'my-backbone-app');
    var orderedJsDeps = $D.orderedJsDependenciesOf('page');
    expect(orderedJsDeps.indexOf('underscore.js')).to.be.below(orderedJsDeps.indexOf('backbone.js'));
    expect(orderedJsDeps.indexOf('backbone.js')).to.be.below(orderedJsDeps.indexOf('my-backbone-app.js'));
    expect(orderedJsDeps.indexOf('jquery.js')).to.be.below(orderedJsDeps.indexOf('my-backbone-app.js'));
  });

  it('should de-duplicate dependencies', function() {
    $D.init({ deps: {
      'page': ['component1.js', 'component2.js', 'component3.js'],
      'component1.js': 'jquery.js',
      'component2.js': 'jquery.js',
      'component3.js': ['component1.js', 'jquery.js']
    }});
    var orderedJsDeps = $D.orderedJsDependenciesOf('page');
    expect(orderedJsDeps.filter(el => el === 'jquery.js')).to.have.length(1);
    expect(orderedJsDeps.filter(el => el === 'component1.js')).to.have.length(1);
  });

  it('should resolve aliases in a multiple-levels-deep graph with de-duplication and get the ordering correct', function() {
    $D.init({
      aliases: {
        'jquery': 'jquery.js',
        'backbone': 'backbone.js',
        'underscore': 'underscore.js',
        'my-backbone-app': 'my-backbone-app.js'
      },
      deps: {
        'backbone': ['underscore', 'jquery'],
        'my-backbone-app': ['backbone', 'jquery']
      }
    });
    $D.addDependency('page', 'my-backbone-app');
    var orderedJsDeps = $D.orderedJsDependenciesOf('page');
    expect(orderedJsDeps.indexOf('underscore.js')).to.be.below(orderedJsDeps.indexOf('backbone.js'));
    expect(orderedJsDeps.indexOf('jquery.js')).to.be.below(orderedJsDeps.indexOf('backbone.js'));
    expect(orderedJsDeps.indexOf('backbone.js')).to.be.below(orderedJsDeps.indexOf('my-backbone-app.js'));
    expect(orderedJsDeps.indexOf('jquery.js')).to.be.below(orderedJsDeps.indexOf('my-backbone-app.js'));
    expect(orderedJsDeps.filter(el => el === 'jquery.js')).to.have.length(1);
  });


});
