(function($){
		$.webshims = $.webshims || {
			ready: function(type, fn){
				fn();
			},
			addReady: function(fn){
				$(function(){
					fn(document, $([]));
				});
			}
		};
		var webshims = $.webshims;

		if(!window.Modernizr || !('opacity' in Modernizr)){
			$('html').addClass($.support.opacity ? 'opacity' : 'no-opacity');
		}

		var props = {};

		var fns = {};



		$.jme = {
			version: '2.0.2',
			classNS: '',
			options: {},
			plugins: {},
			data: function(elem, name, value){
				var data = $(elem).data(ns+'jme') || $.data(elem, ns+'jme', {});
				if(value === undefined){
					return (name) ? data[name] : data;
				} else {
					data[name] = value;
				}
			},
			registerPlugin: function(name, plugin){
				this.plugins[name] = plugin;
				if(!plugin.nodeName){
					plugin.nodeName = '';
				}
				if(!plugin.className){
					plugin.className = name;
				}
			},
			defineMethod: function(name, fn){
				fns[name] = fn;
			},
			defineProp: function(name, desc){
				if(!desc){
					desc = {};
				}
				if(!desc.set){
					if(desc.readonly){
						desc.set = function(){
							throw(name +' is readonly');
						};
					} else {
						desc.set = $.noop;
					}
				}
				if(!desc.get){
					desc.get = function(elem){
						return $.jme.data(elem, name);
					};
				}
				props[name] = desc;
			},
			prop: function(elem, name, value){
				if(!props[name]){
					return $.prop(elem, name, value);
				}
				if(value === undefined){
					return props[name].get( elem );
				} else {
					var setValue = props[name].set(elem, value);
					if(setValue === undefined){
						setValue = value;
					}
					if(setValue != 'noDataSet'){
						$.jme.data(elem, name, setValue);
					}
				}
			},
			setText: function(name, text){
				var obj = name;
				if(name && text){
					obj = {};
					obj[name] = text;
				}
				$.each(obj, function(name, text){
					if($.jme.plugins[name]){
						$.jme.plugins[name].text = text;
					}
				});
			}
		};
		
		var oldAccess = true;
		try {
			$.access( $(document.documentElement), 't', undefined, true, $.noop );
		} catch(er){
			oldAccess = false;
		}

		$.fn.jmeProp = oldAccess ?
			function(name, value){
				return $.access( this, name, value, true, $.jme.prop );
			} :
			function(name, value){
				return $.access( this, $.jme.prop, name, value, arguments.length > 1 );
			}
		;
		
		$.fn.jmeFn = function(fn){
			var args = Array.prototype.slice.call( arguments, 1 );
			var ret;
			this.each(function(){
				ret = (fns[fn] || $.prop(this, fn)).apply(this, args);
				if(ret !== undefined){
					return false;
				}
			});
			return (ret !== undefined) ? ret : this;
		};



		var baseSelector;
		var pluginSelectors = [];
		var ns = '';
		$.jme.createSelectors = function(){
			if(baseSelector){return;}
			ns = $.jme.classNS;
			baseSelector = 'div.'+ns+ 'mediaplayer';
			$.each($.jme.plugins, function(name, plugin){
				plugin.className = ns + plugin.className;
				plugin.selector = plugin.nodeName +'.'+plugin.className;
				pluginSelectors.push(plugin.selector);
				if(ns && plugin.pseudoClasses){
					$.each(plugin.pseudoClasses, function(stateName, stateValue){
						plugin.pseudoClasses[stateName] = ns+stateValue;
					});
				}

			});
			pluginSelectors = pluginSelectors.join(',');
		};
		$.jme.initJME = function(context, insertedElement){
			$('video, audio', context)
				.add(insertedElement.filter('video, audio'))
				.filter('[data-muted]')
				.each(function(){
					$.prop(this, 'muted', true);
				})
				.end()
				.filter('[data-volume]')
				.each(function(){
					var defaultVolume = $(this).data('volume');
					if(defaultVolume <= 1 && defaultVolume >= 0){
						$.prop(this, 'volume', defaultVolume);
					}
				})
			;
	
			$(baseSelector, context).add(insertedElement.filter(baseSelector)).jmePlayer();
		};

		var idlStates = {
			emptied: 1,
			pause: 1
		};

		$.jme.getDOMList = function(attr){
			var list = [];
			if(!attr){
				attr = [];
			}
			if(typeof attr == 'string'){
				attr = attr.split(' ');
			}
			$.each(attr, function(i, id){
				if(id){
					id = document.getElementById(id);
					if(id){
						list.push(id);
					}
				}
			});
			return list;
		};
		
		webshims.ready('dom-support', function(){
			if(!webshims.defineNodeNamesProperty || $('<input />').prop('labels')){return;}
			webshims.defineNodeNamesProperty('button, input, keygen, meter, output, progress, select, textarea', 'labels', {
				prop: {
					get: function(){
						var labels = [];
						var id = this.id;
						if(id){
							labels = $('label[for="'+ id +'"]');
						} 
						if(!labels[0]) {
							labels = $(this).closest('label', this.form);
						}
						return labels.get();
					},
					writeable: false
				}
			});
		});
		

		$.jme.getButtonText = function(button, classes){
			
			var btnTextElem = $('span.jme-text, +label span.jme-text', button);
			var btnLabelElem = button.prop('labels');
			
			btnLabelElem = (btnLabelElem && btnLabelElem[0]) ? $(btnLabelElem).eq(0) : false;
			
			if(!btnTextElem[0]){
				btnTextElem = btnLabelElem || button;
			}
			
			var txt = btnTextElem.text().split('/');
			var title = button.prop('title').split('/');
			
			var isCheckbox;
			var doText;
			var doTitle;
			var lastState;
			var txtChangeFn = function(state){
				if(lastState === state){return;}
				lastState = state;
				if(doText){
					btnTextElem.text(txt[state || 0]);
				}
				if(doTitle){
					button.prop('title', txt[state || 0]);
					if (btnLabelElem) {
						btnLabelElem.prop('title', txt[state || 0]);
					}
				}
				
				if(classes){
					button
						.removeClass(classes[(state) ? 0 : 1])
						.addClass(classes[state])
					;
				}
				if(isCheckbox){
					button.prop('checked', !!state);
					(button.data('checkboxradio') || {refresh: $.noop}).refresh();
				}
			}; 
			
			if(txt.length == 2){
				txt[0] = txt[0].trim();
				txt[1] = txt[1].trim();
				doText = true;
			}
			if(title.length == 2){
				title[0] = title[0].trim();
				title[1] = title[1].trim();
				doTitle = true;
			}
			
			if (button.is('[type="checkbox"], [type="radio"]')){
				button.prop('checked', function(){
					return this.defaultChecked;
				});
				isCheckbox = true;
			} else if(button.is('a')){
				button.bind('click', function(e){
					e.preventDefault();
				});
			}
			
			return txtChangeFn;
		};

		$.fn.jmePlayer = function(opts){
			var removeClasses = ['idle', 'playing', 'ended', 'waiting', 'mediaerror'].map(function(state){
				return ns+'state-'+state;
			}).join(' ');
			return this.each(function(){
				if(opts){
					$.jme.data(this, $.extend(true, {}, opts));
				}
				var media = $('audio, video', this).filter(':first');
				var base = $(this);
				var insideControls = $(pluginSelectors, base);
				var externalControls = $.jme.getDOMList( $.jme.data(this, 'controls') );
				var controls = insideControls.add($(externalControls));
				var jmeData = $.jme.data(this);
				var mediaData = $.jme.data(media[0]);
				var mediaUpdateFn;
				var init, focusenterTimer, foverTimer, canPlay, removeCanPlay, canplayTimer;
				
				mediaData.player = base;
				mediaData.media = media;
				if(!jmeData.media){
					init = true;
					removeCanPlay = function(){
						media.unbind('canplay', canPlay);
						clearTimeout(canplayTimer);
					};
					canPlay = function(){
						var state = ($.prop(this, 'paused')) ? 'idle' : 'playing';
						base.removeClass(removeClasses).addClass(ns +'state-'+ state);
					};
					mediaUpdateFn = function(e){
						var state = e.type;
						var readyState;
						var paused;
						removeCanPlay();
						if(state == 'ended' || $.prop(this, 'ended')){
							state = 'ended';
						} else if(state == 'waiting'){
							
							if($.prop(this, 'readyState') > 2){
								state = '';
							} else {
								canplayTimer = setTimeout(function(){
									if(media.prop('readyState') > 2){
										canPlay();
									}
								}, 9);
								media.bind('canPlay', canPlay);
							}
							
						} else if(idlStates[state]){
							state = 'idle';
						} else {
							readyState = $.prop(this, 'readyState');
							paused = $.prop(this, 'paused');
							if(!paused && readyState < 3){
								state = 'waiting';
							} else if(!paused && readyState > 2){
								state = 'playing';
							} else {
								state = 'idle';
							}
						}
						
						if(state){
							base.removeClass(removeClasses).addClass(ns +'state-'+ state);
						}
					};
					jmeData.media = media;
					jmeData.player = base;
					media
						.bind('ended', function(){
							removeCanPlay();
							media.jmeFn('pause');
							if(!media.prop('autoplay')){
								media.jmeFn('load');
							}
						})
						.bind('emptied waiting canplay canplaythrough playing ended pause mediaerror', mediaUpdateFn)
						.bind('volumechange updateJMEState', function(){
							var volume = $.prop(this, 'volume');
							base[!volume || $.prop(this, 'muted') ? 'addClass' : 'removeClass'](ns +'state-muted');
							if(volume < 0.34){
								volume = 'low';
							} else if(volume < 0.67){
								volume = 'medium';
							} else {
								volume = 'high';
							}
							base.attr('data-volume', volume);
						})
						.bind('emptied updateJMEState play playing waiting', function(e){
							var action;
							if(e.type == 'emptied' || (e.type == 'updateJMEState' && $.prop(this, 'paused'))){
								action = 'addClass';
							} else if(e.type == 'play' || e.type == 'waiting' || e.type == 'playing'){
								action = 'removeClass';
							}
							if(action){
								base[action](ns + 'state-initial');
							}
						})
					;
					
					base
						.bind('useractive', function(){
							base.addClass(ns+'useractive');
						})
						.bind('userinactive', {idletime: 3500}, function(){
							base.removeClass(ns+'useractive');
						})
						.bind('focusin', function(){
							clearTimeout(focusenterTimer);
							base.addClass(ns+'focusenter');
						})
						.bind('focusout', function(){
							clearTimeout(focusenterTimer);
							focusenterTimer = setTimeout(function(){
								base.removeClass(ns+'focusenter');
							}, 1);
						})
						.bind('mouseenter focusin', function(){
							clearTimeout(foverTimer);
							base.addClass(ns+'fover');
						})
						.bind('mouseleave focusout', function(){
							clearTimeout(foverTimer);
							foverTimer = setTimeout(function(){
								base.removeClass(ns+'fover');
							}, 1);
						})
					;
				}
				base.jmeFn('addControls', controls);
				if(init){
					if(jmeData.controlbar){
						base.jmeProp('controlbar', true);
					}
					if(mediaUpdateFn){
						media.bind('updateJMEState', mediaUpdateFn).triggerHandler('updateJMEState');
					}
					
				}
			});
		};


		$.jme.defineProp('isPlaying', {
			get: function(elem){
				return (!$.prop(elem, 'ended') && !$.prop(elem, 'paused') && $.prop(elem, 'readyState') > 1 && !$.data(elem, 'mediaerror'));
			},
			readonly: true
		});

		$.jme.defineProp('player', {
			readonly: true
		});

		$.jme.defineProp('media', {
			readonly: true
		});

		$.jme.defineProp('srces', {
			get: function(elem){
				var data = $.jme.data(elem);
				var src = data.media.prop('src');
				var srces = [];
				if(src){
					return [{src: src}];
				}
				srces = $.map($('source', data.media).get(), function(source){
					var src = {
						src: $.prop(source, 'src')
					};
					var tmp = $.attr(source, 'media');
					if(tmp){
						src.media = tmp;
					}
					tmp = $.attr(source, 'type');
					if(tmp){
						src.type = tmp;
					}
					return src;
				});
				return srces;
			},
			set: function(elem, srces){
				var data = $.jme.data(elem);

				var setSrc = function(i, src){
					if(typeof src == 'string'){
						src = {src: src};
					}
					$(document.createElement('source')).attr(src).appendTo(data.media);

				};
				data.media.removeAttr('src').find('source').remove();
				if($.isArray(srces)){
					$.each(srces, setSrc);
				} else {
					setSrc(0, srces);
				}
				data.media.jmeFn('load');
				return 'noDataSet';
			}
		});
		
		$.jme.defineMethod('togglePlay', function(){
			$(this).jmeFn( ( props.isPlaying.get(this) ) ? 'pause' : 'play' );
		});


		$.jme.defineProp('controlbar', {
			set: function(elem, value){
				value = !!value;
				var data = $.jme.data(elem);
				var controlBar = $('div.jme-default-media-overlay, div.jme-default-control-bar', data.player);
				var mediaControls = $.jme.plugins["media-controls"] ;
				var structure = '';
				var controls;
				if(value && !controlBar[0]){
					if(data._controlbar){
						data._controlbar.appendTo(data.player);
					} else {
						data.media.prop('controls', false);
						$.each(mediaControls.pluginOrder, function(i, name){
							var plugin = $.jme.plugins[name];
							if(plugin && plugin.structure){
								structure += plugin.structure.replace('{%class%}', ns+name).replace('{%text%}', plugin.text || '');
							} else if(name){
								structure += name;
							}
						});
						data._controlbar = $( mediaControls.barStructure );
						controlBar = data._controlbar.find('div.jme-cb-box').addClass(ns+'media-controls');
						controls = data._controlbar.filter('.jme-default-media-overlay').addClass(ns+'play-pause');
						controls =  controls.add( controlBar );
						controls = controls.add( $(structure).appendTo(controlBar) );
						data._controlbar.appendTo(data.player);
						data.player.jmeFn('addControls', controls);
					}

				} else if(!value) {
					controlBar.detach();
				}
				controlBar = null;
				controls = null;
				return value;
			}
		});

		$.jme.defineMethod('addControls', function(controls){
			var data = $.jme.data(this) || {};

			if(!data.media){return;}
			var oldControls = $.jme.data(data.player[0], 'controlElements') || $([]);
			controls = $(controls);
			$.each($.jme.plugins, function(name, plugin){
				controls
					.filter('.'+plugin.className)
					.add(controls.find('.'+plugin.className))
					.each(function(){
						var control = $(this);
						var options = $.jme.data(this);
						options.player = data.player;
						options.media = data.media;
						if(options.rendered){return;}
						options.rendered = true;
						if(plugin.options){
							$.each(plugin.options, function(option, value){
								if(!(option in options)){
									options[option] = value;
								}
							});
						}
						plugin._create(control, data.media, data.player, options);
						control = null;
					})
				;
			});
			
			$.jme.data(data.player[0], 'controlElements', oldControls.add(controls));
			
			data.player.triggerHandler('controlsadded');
		});



		$.jme.defineMethod('updateControlbar', function(){
			var timeSlider = $('.'+ $.jme.classNS +'time-slider', this);
			if(timeSlider[0] && timeSlider.css('position') !== 'absolute'){
				var width = Math.floor(timeSlider.parent().width()) - 0.2;
				
				var elemWidths = 0; 
				timeSlider
					.hide()
					.siblings()
					.each(function(){
						if(this !== timeSlider[0] && $.css(this, 'position') !== 'absolute' && $.css(this, 'display') !== 'none'){
							elemWidths += Math.ceil($(this).outerWidth(true)) + 0.1;
						}
					})
					.end()
					.show()
				;
				timeSlider.width(Math.floor(width - elemWidths - Math.ceil(timeSlider.outerWidth(true) - timeSlider.width()) - 0.3));
			}
		});

		$.jme.registerPlugin('media-controls', {
			pluginOrder: ['play-pause', '<div class="media-bar">', 'currenttime-display', 'time-slider', 'duration-display', '<div class="volume-controls">', 'mute-unmute', 'volume-slider', '</div>', 'fullscreen', '<div class="subtitle-controls">', 'captions', '</div>', '</div>'],
			barStructure: '<div class="jme-default-media-overlay"></div><div class="jme-default-control-bar" tabindex="-1"><div class="jme-cb-box"></div></div>',
			_create: function(control, media, base, options){
				var timer;
				var update = function(){
					clearTimeout(timer);
					control.jmeFn('updateControlbar');
					timer = setTimeout(function(){
						control.jmeFn('updateControlbar');
					}, 9);
				};
				setTimeout(function(){
					media.bind('loadedmetadata volumechange play pause ended emptied', update);
					base.bind('updatetimeformat controlsadded controlschanged playerdimensionchange', update);
					$(window).bind('resize emchange', update);
				}, 1);
				update();
			}
		});


		(function(){
			var activity = {
				add: function(elem, cfg, name){
					var data 		= $.data(elem, 'jmeuseractivity') || $.data(elem, 'jmeuseractivity', {idletime: 2500, idle: true, trigger: {}}),
						jElm 		= $(elem),
						setInactive = function(){
							if(!data.idle){
								data.idle = true;
								if ( data.trigger.userinactive ) {
									jElm.trigger('userinactive');
								}
							}
						},
						x, y,
						setActive 	= function(e){
							if(!e || (e.type === 'mousemove' && e.pageX === x && e.pageY === y)){return;}
							if(e.type === 'mousemove'){
								 x = e.pageX;
								 y = e.pageY;
							}
							if(data.idleTimer){
								clearTimeout(data.idleTimer);
							}
							data.idleTimer = setTimeout(setInactive, data.idletime);
							if(data.idle){
								data.idle = false;
								if( data.trigger.useractive ){
									jElm.trigger('useractive');
								}
							}
						}
					;

					data.idletime = (cfg || {}).idletime || data.idletime;
					if(cfg && 'idle' in cfg){
						data.idle = cfg.idle;
					}
					data.trigger[name] = true;

					if( !data.bound ){
						jElm
							.bind('mouseleave.jmeuseractivity', setInactive)
							.bind('mousemove.jmeuseractivity focusin.jmeuseractivity mouseenter.jmeuseractivity keydown.jmeuseractivity keyup.jmeuseractivity mousedown.jmeuseractivity', setActive)
						;
						data.bound = true;
					}
					if(!data.idle){
						setActive({type: 'initunidled'});
					}
				},
				remove: function(elem, name){
					var data = $.data(elem, 'jmeuseractivity') || $.data(elem, 'jmeuseractivity', {idletime: 2500, idle: true, trigger: {}});
					data.trigger[name] = false;
					if(!data.trigger.useractive && !data.trigger.userinactive){
						$(elem).unbind('.jmeuseractivity');
						data.bound = false;
					}
				}
			};
			$.each(['useractive', 'userinactive'], function(i, name){
				$.event.special[name] = {
					setup: function(cfg){
						activity.add(this, cfg, name);
					},
					teardown: function(){
						activity.remove(this, name);
					}
				};
			});
		})();
})(jQuery);
	
(function($){
	var pseudoClasses = 'pseudoClasses';

	var playStates = {
		play: 1,
		playing: 1
	};
	
	var pauseStates = {
		pause: 1,
		ended: 1
	};
	
	var assumeIE7 = ($.browser.msie && parseFloat($.browser.version, 10) < 8);

	var loadJqueryUI = function(){
		if($.webshims.loader){
			$.webshims.loader.loadList(['jquery-ui']);
			if($.webshims.modules['input-widgets'].src){
				$.webshims.loader.loadList(['input-widgets']);
			}
		}
	};
	var btnStructure = '<button class="{%class%}"><span class="jme-icon"></span><span class="jme-text">{%text%}</span></button>';
	var defaultStructure = '<div  class="{%class%}"></div>';
	var slideStructure = '<div class="{%class%}"><div class="slider-rail"><a href="#" class="ui-slider-handle"></a></div></div>';
	
	$.jme.registerPlugin('play-pause', {
		pseudoClasses: {
			play: 'state-paused',
			pause: 'state-playing'
		},
		structure: btnStructure,
		text: 'play / pause',
		_create: function(control, media, base){
			var textFn = $.jme.getButtonText(control, [this[pseudoClasses].play, this[pseudoClasses].pause]);
			
			media
				.bind('play playing ended pause updateJMEState', function(e){
					var state = e.type;
					if(playStates[state]){
						state = 1;
					} else if(pauseStates[state]) {
						state = 0;
					} else {
						state = (media.jmeProp('isPlaying') )? 1 : 0;
					}
					textFn(state);
				})
				.triggerHandler('updateJMEState')
			;
			control.bind((control.is('select')) ? 'change' : 'click', function(e){
				media.jmeFn('togglePlay');
				e.stopPropagation();
			});
			
		}
	});

	$.jme.registerPlugin('mute-unmute', {
		pseudoClasses: {
			mute: 'state-mute',
			unmute: 'state-unmute'
		},
		structure: btnStructure,
		text: 'mute / unmute',
		_create: function(control, media, base){
			var textFn = $.jme.getButtonText(control, [this[pseudoClasses].mute, this[pseudoClasses].unmute]);
			media
				.bind('volumechange updateJMEState', function(e){
					textFn(media.prop('muted') ? 1 : 0);
				})
				.triggerHandler('updateJMEState')
			;
			
			control.bind((control.is('select')) ? 'change' : 'click', function(e){
				media.prop('muted', !media.prop('muted'));
				e.stopPropagation();
			});
			
		}
	});

	var onSliderReady = function(fn){
		var complete = function(){
			if(!$.fn._uiSlider){
				if(!$.mobile || !$.mobile.slider){
					$.fn._uiSlider = $.fn.slider;
				} else {
					$.widget('jme._uiSlider', $.ui.slider.prototype);
				}
			}
			fn();
		};
		$.webshims.ready('jquery-ui', function(){
			if(!$.ui || !$.ui.slider){
				$.webshims.ready('input-widgets', complete);
			} else {
				complete();
			}
		});
	};

	function createGetSetHandler(get, set){
		var throttleTimer;
		var blockedTimer;
		var blocked;
		return {
			get: function(){
				if(blocked){return;}
				return get.apply(this, arguments);
			},
			set: function(){
				clearTimeout(throttleTimer);
				clearTimeout(blockedTimer);

				var that = this;
				var args = arguments;
				blocked = true;
				throttleTimer = setTimeout(function(){
					set.apply(that, args);
					blockedTimer = setTimeout(function(){
						blocked = false;
					}, 30);
				}, 0);
			}
		};
	}

	$.jme.registerPlugin('volume-slider', {
		structure: slideStructure,
		
		_create: function(control, media, base){
			loadJqueryUI();
			
			var volume = createGetSetHandler(
				function(){
					var volume = media.prop('volume');
					if(volume !== undefined){
						control._uiSlider('value', volume);
					}
				},
				function(value){
					media.prop({
						muted: false,
						volume: value
					});
				}
			);
			var createFn = function(){
				
				control._uiSlider({
					range: 'min',
					max: 1,
					step: 0.05,
					value: media.prop('volume'),
					slide: function(e, data){
						if(e.originalEvent){
							volume.set(data.value);
						}
					}
				});
				media.bind('volumechange', volume.get);
			};

			onSliderReady(createFn);
		}
	});

	$.jme.registerPlugin('time-slider', {
		structure: slideStructure,
		pseudoClasses: {
			no: 'no-duration'
		},
		options: {
			format: ['mm', 'ss']
		},
		_create: function(control, media, base){
			loadJqueryUI();
			var module = this;
			var time = createGetSetHandler(
				function(){
					var time = media.prop('currentTime');
					if(!isNaN(time)){
						try {
							control._uiSlider('value', time);
						} catch(er){}
					}
					
				},
				function(value){
					try {
						media.prop('currentTime', value).triggerHandler('timechanged', [value]);
					} catch(er){}
				}
			);
			var createFn = function(){
				var duration = media.prop('duration');
				var hasDuration = $.jme.classNS+'has-duration';
				var noDuration = $.jme.classNS+'no-duration';
				var durationChange = function(){
					duration = media.prop('duration');
					if(duration && isFinite(duration) && !isNaN(duration)){
						control
							._uiSlider('option', 'disabled', false)
							._uiSlider('option', 'max', duration)
						;
						base.removeClass(module[pseudoClasses].no);
					} else {
						control._uiSlider('option', 'disabled', true);
						control._uiSlider('value', 0);
						base.addClass(module[pseudoClasses].no);
					}
				};
				control._uiSlider({
					range: assumeIE7 ? false : 'min',
					step: 0.1,
					value: media.prop('currentTime'),
					slide: function(e, data){
						if(e.originalEvent){
							time.set(data.value);
						}
					}
				});
				media.bind({
					timeupdate: time.get,
					emptied: function(){
						durationChange();
						control._uiSlider('value', 0);
					},
					durationchange: durationChange
				});
				durationChange();
			};
			base.jmeFn('addControls', $('<div class="'+ $.jme.classNS +'buffer-progress" />').prependTo(control) );
			onSliderReady(createFn);
		}
	});


	$.jme.defineMethod('concerningRange', function(type, time){
		var elem = this;
		var ret = {start: 0, end: 0};
		if(!type){
			type = 'buffered';
		}
		type = $.prop(elem, type);

		if(time == null){
			time = $.prop(elem, 'currentTime');
		}
		if(!type || !('length' in type)){return ret;}
		for(var i = 0, len = type.length; i < len; i++){
			ret.start = type.start(i);
			ret.end = type.end(i);
			if(ret.start <= time && ret.end >= time){

				break;
			}
		}
		return ret;
	});

	$.jme.defineProp('progress', {
		get: function(elem){
			var data = $.jme.data(elem);
			if(!data.media){return 0;}
			var progress = data.media.jmeFn('concerningRange').end / data.media.prop('duration') * 100;
			if(progress > 99.4){
				progress = 100;
			}
			return progress || 0;
		},
		readonly: true
	});

	$.jme.registerPlugin('buffer-progress', {
		_create: function(control, media, base, options){
			var indicator = $('<div class="'+ $.jme.classNS +'buffer-progress-indicator" />').appendTo(control);
			var drawBufferProgress = function(){
				var progress = media.jmeProp('progress');


				if(options.progress !== progress){
					options.progress = progress;
					indicator.css('width', progress +'%');
				}
			};
			media.bind({
				progress: drawBufferProgress,
				emptied: function(){
					indicator.css('width', 0);
					options.progress = 0;
				},
				playing: drawBufferProgress
			});
			drawBufferProgress();
		}
	});

	var times = {
		hh: 60000,
		mm: 60,
		ss: 1,
		ms: 1/1000
	};
	var formatTime = function(sec, format){
		var data;
		if(!format){
			format = ['mm', 'ss'];
		}
		if(sec == null){
			data = $.jme.data(this);
			sec = $.prop(data.media, 'duration');
		}
		if(!sec){
			sec = 0;
		}
		var formated = [];
		var frac;
		for(var i = 0, len = format.length; i < len; i++){
			if(format[i] == 'ms' && i == len -1 ){
				frac = Math.round( (sec / times[format[i]]) / 10);
			} else {
				frac = parseInt(sec / times[format[i]], 10);
				sec = sec % times[format[i]];
			} 
			if(frac < 10){
				frac = '0'+frac;
			}
			formated.push( frac );
		}

		return formated.join(':');
	};
	$.jme.defineMethod('formatTime', formatTime);

	$.jme.defineProp('format', {
		set: function(elem, format){
			if(!$.isArray(format)){
				format = format.split(':');
			}
			var data = $.jme.data(elem);
			data.format = format;
			$(elem).triggerHandler('updatetimeformat');
			data.player.triggerHandler('updatetimeformat');
			return 'noDataSet';
		}
	});

	$.jme.registerPlugin('duration-display', {
		structure: defaultStructure,
		options: {
			format: "mm:ss"
		},
		_create: function(control, media, base, options){
			if(typeof options.format == 'string'){
				options.format = options.format.split(':');
			}
			var showDuration = function(){
				control.html(formatTime(media.prop('duration'), options.format));
			};
			media.bind('durationchange emptied', showDuration);

			control
				.bind('updatetimeformat', showDuration)
				.jmeProp('format', options.format)
			;
		}
	});

	$.jme.defineProp('countdown', {
		set: function(elem, value){

			var data = $.jme.data(elem);
			data.countdown = !!value;
			$(elem).triggerHandler('updatetimeformat');
			data.player.triggerHandler('updatetimeformat');
			return 'noDataSet';
		}
	});

	$.jme.registerPlugin('currenttime-display', {
		structure: defaultStructure,
		options: {
			format: "mm:ss",
			countdown: false
		},
		_create: function(control, media, base, options){
			if(typeof options.format == 'string'){
				options.format = options.format.split(':');
			}

			var showTime = function(e){
				var currentTime = media.prop('currentTime');
				if(options.countdown){
					currentTime = (media.prop('duration') || 0) - currentTime;
					if(currentTime < 0.7){
						currentTime = 0;
					}
				}
				control.html(formatTime(currentTime, options.format));
			};
			media.bind('timeupdate emptied durationchange', showTime);

			control
				.bind('updatetimeformat', showTime)
				.jmeProp('format', options.format)
			;
		}
	});


	/**
	 * Added Poster Plugin
	 * @author mderting
	 */
	
	/*
	 * the old technique wasn't fully bullet proof
	 * beside this, jme2 adovactes to use the new improved state-classes to handle visual effect on specific state (see CSS change)
	 */
	$.jme.registerPlugin('poster-display', {
		structure: '<div />',
		options: {
		},
		_create: function(control, media, base, options){
			
			/* Empty span element used for vertical centering in IE7 - thanks to Bruno Fassino.
			 * @see http://www.brunildo.org/test/img_center.html
			 */
			var updatePoster = function(){
				var poster = media.prop('poster');
				if(poster){
					control.html('<span></span><img src="'+ poster +'" class="'+ $.jme.classNS +'poster-image" />');
				} else {
					control.empty();
				}
			};
			media.bind('emptied', updatePoster);
			updatePoster();
		}
	});
	
	
})(jQuery);

(function($){
	var started, startedTimer;
	var jmeInitWarning = function(){
		if(started){return;}
		if(window.console){
			window.console.log('you need to call $.jme.startJME. Call startJME now delayed!');
		}
		$.jme.startJME();
	};
	
	$(function(){
		startedTimer = setTimeout(jmeInitWarning, 999);
	});
	$.jme.startJME = function(){
		if(started){return;}
		$(function(){
			$.jme.createSelectors();
			if(!$.jme.blockInit){
				$.jme.initJME(document, $([]));
			}
		});
		$.webshims.ready('mediaelement', function(){
			$.webshims.addReady(function(context, insertedElement){
				if(context !== document){
					$.jme.initJME(context, insertedElement);
				}
			});
		});
		$(window).unbind('load', jmeInitWarning);
		started = true;
		clearTimeout(startedTimer);
	};
	
	$(window).bind('load', jmeInitWarning);
})(jQuery);
