/*
The MIT License (MIT)

Copyright (c) 2014 Sébastien Mischler (skarab)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

(function (window) {
    // ------------------------------------------------------------------------
    // globals
    // ------------------------------------------------------------------------
    var version  = '1.0'; // Looper App version
    var instance = null;  // Looper App instance (singleton)
    var context  = null;  // global audio context
    var looper   = null;  // Looper instance (singleton)
    var looperUI = null;  // Looper UI instance (singleton)

    // ------------------------------------------------------------------------
    // LooperApp (namespace | singleton)
    // ------------------------------------------------------------------------
    function LooperApp() {
        // singleton
        if (instance) {
            return instance;
        }

        // force object instantiation
        if(! (this instanceof LooperApp)) {
            return new LooperApp();
        }

        // instance
        instance = this;

        // Looper instance (singleton)
        looper = Looper();  

        // Looper UI instance (singleton)
        looperUI = LooperUI(); 

        // graphs collection
        this.graphs = {};
    };

    // ------------------------------------------------------------------------
    // create/register AudioGraph
    // ------------------------------------------------------------------------
    LooperApp.prototype.createAudioGraph = function(name) {
        // AudioGrap
        var graph = new looper.AudioGraph();

        // gain analizer
        var analizer = new looper.GainAnalizer(name, looperUI.gainProcessor);

        // attach after graph filters
        analizer.attach(graph.merger);

        // register
        return instance.graphs[name] = {
            graph    : graph,
            analizer : analizer
        };
    };

    LooperApp.prototype.getAudioGraph = function(name) {
        return instance.graphs[name] || null;
    };

    LooperApp.prototype.removeAudioGraph = function(name) {
        instance.graphs[name] = null;
    };

    LooperApp.prototype.getGraph = function(name) {
        return instance.graphs[name] ? instance.graphs[name].graph : null;
    };

    LooperApp.prototype.getAnalizer = function(name) {
        return instance.graphs[name] ? instance.graphs[name].analizer : null;
    };

    // ------------------------------------------------------------------------
    // add loop
    // ------------------------------------------------------------------------
    LooperApp.prototype.addLoop = function() {
        // create and add a new loop in Looper.Loops "collection"
        var loop = looper.Loops().add();
        var id   = 'loop_' + loop.id;

        // create loop AudioGraph
        var graph = instance.createAudioGraph(id).graph;

        // set graph as loop destination
        loop.setDestination(graph);
        
        // connect to output graph
        looper.connect(graph, instance.getGraph('output'));

        // user interface
        looperUI.createLoopPanel(id, 'loop', loop).appendTo('#loopsWrapper');
        
        var panel = looperUI.getLoopPanel(loop);

        panel.volume.toggle();

        panel.filtersPanel.toggle();
    };

    // ------------------------------------------------------------------------
    // remove loop
    // ------------------------------------------------------------------------
    LooperApp.prototype.removeLoop = function(id) {
        var loops = looper.Loops();
        var loop  = loops.getLoop(id);
        var panel = looperUI.getLoopPanel(loop);
        var graph = instance.getGraph('loop_' + loop.id);
        
        // disconnect loop graph to output graph
        looper.disconnect(graph, instance.getGraph('output'));

        // remove graph
        instance.removeAudioGraph('loop_' + loop.id);

        // remove loop
        loops.remove(loop);

        // remove panel
        panel.panel.$wrapper.remove();
    };

    // ------------------------------------------------------------------------
    // initialization
    // ------------------------------------------------------------------------
    LooperApp.prototype.init = function(stream) {
        // global audio context
        context = looper.getContext();
        
        // mono to stereo microphone stream
        var microphone = looper.microphone(stream);

        // create input/output AudioGraph
        var input  = instance.createAudioGraph('input').graph;
        var output = instance.createAudioGraph('output').graph;

        // connexions
        looper.connect(microphone, input);
        looper.connect(input, output);
        looper.connect(output, context);

        // Loops instance (singleton)
        var loops = looper.Loops();

        // Metronome init (tempo, beats per bar)
        var metronome = looper.Metronome(90, 4);

        // sheduler callback
        metronome.shedulePlay = loops.shedulePlay;

        // recorder
        var recorder = looper.Recorder(input);

        // on audio process callback
        recorder.onaudioprocess = loops.record;

        // user interface -----------------------------------------------------

        looperUI.createPanel('input').appendTo('#inputWrapper').toggle();
        looperUI.createPanel('output').appendTo('#outputWrapper').toggle();
        looperUI.createMetronomePanel().appendTo('#metronomeWrapper');

        // metronome drawing (on each beat)
        metronome.draw = looperUI.metronomeDraw;

        // first loop
        instance.addLoop();
    };

    // ------------------------------------------------------------------------
    // exports
    // ------------------------------------------------------------------------
    window.LooperApp = LooperApp;

})(this);