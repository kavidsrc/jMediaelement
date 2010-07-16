﻿
package com.protofunc.jme.jmefs {

	import flash.display.Sprite;
	import com.longtailvideo.jwplayer.player.*;
	import com.longtailvideo.jwplayer.plugins.*;
	import flash.events.Event;
	import flash.utils.describeType;
	
	public class JMEFS extends Sprite implements IPlugin {

		private static const ID:String = "jmefs";

		private var _config:PluginConfig;

		private var _player:IPlayer;

		private var _button:Button;


		public function initPlugin(player:IPlayer, config:PluginConfig):void {
			_player = player;
			_config = config;

			_button = new Button(_player);
			addChild(_button);

			_button.x = _config.button_x | 0;
			_button.y = _config.button_y | 0;
			_button.width = _config.button_width | 0;
			_button.height = _config.button_height | 0;
			_button.alpha = _config.button_opaque == true ? 1 : 0;

			addCallback("jmefsSetButtonCallback", _button.setCallback);
			addCallback("jmefsSetButtonPosition", _button.setPosition);
			addCallback("jmefsSetButtonSize", _button.setSize);
			addCallback("jmefsSetButtonCursor", _button.setCursor);
			
			addCallback("jmeExitFullScreen", this.exitFullScreen);
			
			stage.addEventListener(Event.RESIZE, resizeHandler);
		}
		
		public function exitFullScreen():void {
			if (typeof(_player.fullscreen) == "boolean") {
				_player["fullscreen"] = false;
			}
			else {
				_player["fullscreen"](false);
			}
		}
		
		private function resizeHandler(event:Event):void {
			_button.dispatch("resize");
		}


		public function resize(w:Number, h:Number):void {
			
		}

		
		public function get id():String {
			return ID;
		}
	}
}

import flash.display.Sprite;
import flash.external.ExternalInterface;
import flash.events.MouseEvent;
import com.longtailvideo.jwplayer.player.*;


class Button extends Sprite {

	private var _callbackName:String = "";
	private var _vId:String = "";
	private var _cId:String = "";
	private var _player:IPlayer;
	

	public function Button(player:IPlayer) {
		_player = player;
		
		graphics.beginFill(0xFF0000, 1);
		graphics.drawRect(0, 0, 64, 64);
		graphics.endFill();

		addEventListener(MouseEvent.MOUSE_OVER, mouseHandler);
		addEventListener(MouseEvent.MOUSE_OUT, mouseHandler);
		addEventListener(MouseEvent.CLICK, mouseHandler);
	}


	public function setCursor(b:Boolean):void {
		buttonMode = b;
	}


	public function setPosition(posX:Number, posY:Number):void {
		x = posX;
		y = posY;
	}


	public function setSize(w:Number, h:Number):void {
		width = w;
		height = h;
	}


	public function setCallback(callbackName:String, vId:String, cId:String):void {
		_callbackName = callbackName;
		_vId = vId;
		_cId = cId;
	}


	public function dispatch(eventType:String):void {
		if (_callbackName && ExternalInterface.available) {
			ExternalInterface.call(_callbackName, eventType, _vId, _cId);
		}
	}
	

	private function mouseHandler(e:MouseEvent):void {
		switch(e.type) {
		case MouseEvent.MOUSE_OVER:  dispatch("jmefsButtonOver"); break;
		case MouseEvent.MOUSE_OUT:   dispatch("jmefsButtonOut"); break;
		case MouseEvent.CLICK:
			_player.play();
			if (typeof(_player.fullscreen) == "boolean") {
				_player["fullscreen"] = true;
			}
			else {
				_player["fullscreen"](true);
			}
			dispatch("jmefsButtonClick");
			break;
		}
	}
}


function addCallback(funName:String, fun:Function):void {
	if (ExternalInterface.available) {
		try {
			ExternalInterface.addCallback(funName, fun);
		}
		catch(e:Error) {
			trace("ExternalInternface.addCallback(" + funName + ", " + fun + ")");
			trace(e);
		}
	}
	else {
		trace("addCallback - ExternalInterface not available");
	}
}


function log(message:String):void {
	return;
	if (ExternalInterface.available) {
		try {
			ExternalInterface.call("console.log" , message);
		}
		catch(e:Error) {
			trace(e);
		}
	}
	else {
		trace(message);
	}
}