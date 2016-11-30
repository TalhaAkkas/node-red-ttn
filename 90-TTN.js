/**
 * Copyright 2016 Willem Eradus
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
    "use strict";
    // require any external libraries we may need....
	var CryptoJS = require("crypto-js");
	var btoa = require('btoa')
    // The main node definition - most things happen in here
    function TTNdecryptNode(n) {
        // Create a RED node
        RED.nodes.createNode(this,n);
        // Store local copies of the node configuration (as defined in the .html)
        this.key = CryptoJS.enc.Hex.parse (n.key);
		this.iv =  CryptoJS.enc.Hex.parse ('00000000000000000000000000000000');
        // copy "this" object in case we need it in context of callbacks of other functions.
        var node = this;
		//
		Number.prototype.hex = function (size) {
			var s = this.toString(16).toUpperCase();
			while (s.length < size) s = "0" + s;
			return s;
		}
		//
		CryptoJS.enc.u8array = {
			/**
			 * Converts a word array to a Uint8Array.
			 *
			 * @param {WordArray} wordArray The word array.
			 *
			 * @return {Uint8Array} The Uint8Array.
			 *
			 * @static
			 *
			 * @example
			 *
			 *     var u8arr = CryptoJS.enc.u8array.stringify(wordArray);
			 */
		stringify: function (wordArray) {
			// Shortcuts
			var words = wordArray.words;
			var sigBytes = wordArray.sigBytes;

			// Convert
			var u8 = new Uint8Array(sigBytes);
			for (var i = 0; i < sigBytes; i++) {
				var byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
				u8[i]=byte;
			}

			return u8;
			},
			/**
			 * Converts a Uint8Array to a word array.
			 *
			 * @param {string} u8Str The Uint8Array.
			 *
			 * @return {WordArray} The word array.
			 *
			 * @static
			 *
			 * @example
			 *
			 *     var wordArray = CryptoJS.enc.u8array.parse(u8arr);
			 */
		parse: function (u8arr) {
			// Shortcut
			var len = u8arr.length;

			// Convert
			var words = [];
			for (var i = 0; i < len; i++) {
				words[i >>> 2] |= (u8arr[i] & 0xff) << (24 - (i % 4) * 8);
				}
			return CryptoJS.lib.WordArray.create(words, len);
			}
		};

		Uint8Array.prototype.toHexString = function () {
			// console.log(this.buffer);
			var str = "";
			for (var i=0; i<this.length; i++) {
				var x = this.buffer[i];
				if (i)
					str = str + "-";
				if (x < 16)
					str = str + "0" + x.toString(16);
				else
					str = str + x.toString(16);

			}
			return str;
		}

		function isASCII(str) {
			return /^[\x20-\x7E]*$/.test(str);
		}

		function deCrypt(data,key,iv) {
			var decrypted  = CryptoJS.AES.decrypt(data, key, {mode: CryptoJS.mode.ECB, iv:iv,padding: CryptoJS.pad.NoPadding});
			return decrypted;

		}
        // Do whatever you need to do in here - declare callbacks etc
        // Note: this sample doesn't do anything much - it will only send
        // this message once at startup...
        // Look at other real nodes for some better ideas of what to do....
		// respond to inputs....
        this.on('input', function (msg) {
            // node.warn("I saw a payload: "+msg.payload.rawData);
            // in this example just send it straight on... should process it here really
			var data = new Buffer(msg.payload.raw, 'base64');
			var obj = deCrypt(data,this.key,this.iv);;
			msg.payload.decrypted = obj;
            node.send(msg);
        });

        this.on("close", function() {
            // Called when the node is shutdown - eg on redeploy.
            // Allows ports to be closed, connections dropped etc.
            // eg: node.client.disconnect();
        });
    }

    // Register the node by name. This must be called before overriding any of the
    // Node functions.
    RED.nodes.registerType("decrypt-ttn",TTNdecryptNode);

}
