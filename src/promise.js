function Promise(fn) {
    var state = 'pending';
    var deferred;
    var value;

    this.then = function(onResolved) {
        deferred = onResolved;
        if(state==='resolved'){
            deferred(value);
        }
    };

    function resolve(newValue){
        state = 'resolved';
        value = newValue;

        if(deferred) {
            deferred(value);
        }
    }

    fn(resolve);
}

module.exports = Promise;