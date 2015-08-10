$(document).ready(function(){
    
    var currentImg = 0,
        frameWidth = 640, // set the width of individual sprite frames
        frameCount = 36, // how many frames are in the sprite?
        dragSpeed = 36, // lower = faster spin whilst dragging
        dragging = false,
        lastMousePosX = 0,
        $dragArea = $('#drag-area'),
        $dragContainer = $('#drag-container'),
        $dragImg = $('#drag-img'),
        useTransforms = $('html').hasClass('csstransforms3d'); // use modernizr
        

    // options for inertia
    var intertiaAcceleration = 10, // how heavy/light the spin feels, lower = heavier
        duration = 60; // higher = longer interia spins
    

    // used throughout, not to be changed
    var inertiaSpin = false,
        spinDirection = '',
        inputMovementSpeed,
        target = 0,
        begin = 0,
        finish = 0,
        change = 0,
        now,
        then = new Date(),
        delta,
        timestamp = 0,
        lastInputPosition = 0;
    
    var easeIn = function(t, b, c, d) {
        return -c *(t/=d)*(t-2) + b;
    };


    function imageLoader(imgPath) {

        console.log('loading image');
        
        var img = new Image();

        img.src = imgPath;

        // note that this is 'one', not 'on', because we don't 
        // need this event to fire more than once.
        $(img).one('load', function() {
            
            console.log('loading finished');

            // now that the img has loaded, we swap out the src attribute
            $dragImg.attr('src', imgPath);
            
        });


    }


    // measure the speed and the direction of the mouse along x axis
    function measureInputMovement(e) {
        
        if (timestamp === 0) {
            timestamp = new Date();
            lastInputPosition = e.pageX;
            return;
        }

        var now = new Date();
        var dt =  now - timestamp;
        var dx = e.pageX - lastInputPosition;
        
        inputMovementSpeed = Math.round(dx / dt * intertiaAcceleration);
        timestamp = now;
        lastInputPosition = e.pageX;

        // negative value means moved left
        // positive means right
        if (inputMovementSpeed < 0) {
            spinDirection = 'left';
        } else {
            spinDirection = 'right';
        }

    }


    function manageDragging() {

        var offsetLeft;

        $dragArea.on('mousedown touchstart', function(e) {

            if (e.type !== 'touchstart') {
                e.preventDefault();
            }
            
            dragging = true;
            
            // reset all input movement counts
            timestamp = 0;
            lastInputPosition = 0;
            inputMovementSpeed = 0;

            /*if (inertiaSpin) {
                inertiaSpin = false;
                target = 0;
                begin = 0;
                change = 0;
                finish = 0;
                then = new Date();
            }*/


        }).on('mousemove touchmove', function(e) {

            // determine whether mouse or touch,
            // adjust 'e' accordingly
            if (e.type === 'touchmove') {
                var e = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
            } else {
                e.preventDefault();
            }

            offsetLeft = e.pageX - $dragContainer[0].offsetLeft;
            
            if (dragging) {
                measureInputMovement(e);
                moveImage(offsetLeft);
            } else {
                lastMousePosX = offsetLeft;
            }

        });

        $(document).on('mouseup touchend', function(e) {
            dragging = false;

            // here we make sure that mouseup/touchend
            // don't trigger the intertia function, unless
            // you actually mouseup/touchend on the car-drag-area
            // like you could otherwise drag off the browser, and release
            // and it would still spin, which wouldn't feel right
            var $mouseUpArea = $(e.target);

            if ($mouseUpArea.attr('id') === 'drag-area' || $mouseUpArea.parents('#drag-area').length) {
                finish = Math.abs(inputMovementSpeed);
                inertia(offsetLeft);
            }

        });
    }

    function doTheWhirlwind(frameWidth, currentImg) {

        // Modernizr test if browser supports csstransforms3d, otherwise just use 'left'
        if ( useTransforms ) {

            $dragImg.css({
                'transform': 'translate3D(-' + (frameWidth * currentImg) + 'px, 0, 0)'
            });

        } else {

            $dragImg.css({
                'left': -(frameWidth * currentImg)
            });

        }
    }

    function moveImage(currentMousePosX) {

        // increment
        if (lastMousePosX - currentMousePosX < -dragSpeed) {
            lastMousePosX = currentMousePosX;
            currentImg = --currentImg < 0 ? frameCount-1 : currentImg;
            
        // decrement
        } else if (lastMousePosX - currentMousePosX > dragSpeed) {
            lastMousePosX = currentMousePosX;
            currentImg = ++currentImg >= frameCount ? 0 : currentImg;
        } else {        
            return; // return here to prevent wasted css position changes
        }

        doTheWhirlwind(frameWidth, currentImg);
        

    }

    function colourPicker() {
        // handle colour pickers
        // this is a "delegated" click handler for any <a> tags inside #colour-picker
        // these guys are more efficient and future-proof than adding 
        // click handlers to each individual <a> tag
        $('#colour-picker').on('click', 'a', function(e) {
            e.preventDefault();

            var $this = $(this);

            // if you click a colour that's already active
            // return out of the function
            if ($this.hasClass('active') ) {
                return;
            }

            $('#colour-picker').find('.active').removeClass('active'); // remove existing active
            $this.addClass('active');

            // here we grab the href of the <a> colour swatch that was clicked
            // and that must map to the image file name, like 'img2.png', or whatev
            var imgHref = this.hash.replace('#',''),
                imgPath = 'images/' + imgHref + '.png';

            // then we send that filename as an argument into the image loader
            imageLoader(imgPath)

        });

    }



    // polyfill for request animation frame
    (function() {
        var lastTime = 0;
        var vendors = ['ms', 'moz', 'webkit', 'o'];
        for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
            window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                       || window[vendors[x]+'CancelRequestAnimationFrame'];
        }
     
        if (!window.requestAnimationFrame)
            window.requestAnimationFrame = function(callback, element) {
                var currTime = new Date().getTime();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
                  timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };
     
        if (!window.cancelAnimationFrame)
            window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
    }());

    
    function inertia(currentMousePosX) {


        // Called on each frame.
        var onEnterFrame = function () {

            begin = target;
            change = finish - begin;

            // Easing into the target.
            target = easeIn(1, begin, change, duration);

            now = new Date();
            delta = now - then;

            if (delta > 1000/change) {
                inertiaSpin = true;
                
                if (dragging) { 
                    inertiaSpin = false;
                    target = 0;
                    return;
                }

                then = now - (delta % 1000/change);

                // inc
                if (spinDirection === 'right') {
                    currentImg = --currentImg < 0 ? frameCount-1 : currentImg;
                } else if (spinDirection === 'left') {
                    currentImg = ++currentImg >= frameCount ? 0 : currentImg;
                } else {
                    return;
                }
                
                doTheWhirlwind(frameWidth, currentImg);


                // spin is slow enough abort the animation frame loop
                if (change < intertiaAcceleration) {
                    inertiaSpin = false;
                    target = 0;
                    begin = 0;
                    change = 0;
                    finish = 60;
                    change = 60;
                    then = new Date();
                    cancelAnimationFrame(onEnterFrame);
                    return;
                }
                
                //console.log('loop')

            }

            requestAnimationFrame(onEnterFrame);

        };

        onEnterFrame();
    
    }

    // call all of our functions
    imageLoader('images/img.png'); // here we load the first car colour img
    manageDragging();
    colourPicker();

    
});