function Promise(fn) {
    var callback = null;

    this.then = function(cb) {
        callback = cb;
    };
    function resolve(value){
        setTimeout(function(){
            callback(value);
        }, 10);
    }

    fn(resolve);
}

module.exports = Promise;