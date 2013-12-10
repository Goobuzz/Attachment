require([
	'js/Game',
	'js/Time',
	'js/Input',
	'js/Cursor',
	'goo/loaders/DynamicLoader',
	'goo/math/Vector3',
	'goo/util/rsvp',
	'goo/entities/EntityUtils',
	'js/Attachment',
	'goo/math/Plane',
	'goo/renderer/Camera',
	'goo/entities/components/CameraComponent'
], function (
	Game,
	Time,
	Input,
	Cursor,
	DynamicLoader,
	Vector3,
	RSVP,
	EntityUtils,
	Attachment,
	Plane,
	Camera,
	CameraComponent
) {
	'use strict';
	function init() {

		// If you try to load a scene without a server, you're gonna have a bad time
		if (window.location.protocol==='file:') {
			alert('You need to run this webpage on a server. Check the code for links and details.');
			return;

			/*

			Loading scenes uses AJAX requests, which require that the webpage is accessed via http. Setting up 
			a web server is not very complicated, and there are lots of free options. Here are some suggestions 
			that will do the job and do it well, but there are lots of other options.

			- Windows

			There's Apache (http://httpd.apache.org/docs/current/platform/windows.html)
			There's nginx (http://nginx.org/en/docs/windows.html)
			And for the truly lightweight, there's mongoose (https://code.google.com/p/mongoose/)

			- Linux
			Most distributions have neat packages for Apache (http://httpd.apache.org/) and nginx
			(http://nginx.org/en/docs/windows.html) and about a gazillion other options that didn't 
			fit in here. 
			One option is calling 'python -m SimpleHTTPServer' inside the unpacked folder if you have python installed.


			- Mac OS X

			Most Mac users will have Apache web server bundled with the OS. 
			Read this to get started: http://osxdaily.com/2012/09/02/start-apache-web-server-mac-os-x/

			*/
		}

		// Make sure user is running Chrome/Firefox and that a WebGL context works
		var isChrome, isFirefox, isIE, isOpera, isSafari, isCocoonJS;
	 	isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
	  	isFirefox = typeof InstallTrigger !== 'undefined';
	  	isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
	  	isChrome = !!window.chrome && !isOpera;
	  	isIE = false || document.documentMode;
	  	isCocoonJS = navigator.appName === "Ludei CocoonJS";
		if (!(isFirefox || isChrome || isSafari || isCocoonJS)) {
			alert("Sorry, but your browser is not supported.\nGoo works best in Google Chrome or Mozilla Firefox.\nYou will be redirected to a download page.");
			window.location.href = 'https://www.google.com/chrome';
		} else if (!window.WebGLRenderingContext) {
			alert("Sorry, but we could not find a WebGL rendering context.\nYou will be redirected to a troubleshooting page.");
			window.location.href = 'http://get.webgl.org/troubleshooting';
		} else {
			Game.world.setSystem(new Time(Game));

			// add a callback for when they click 'play'
			$('#playButton').click(function(){
				console.log("Clicked PlayButton");
				// hide the menu
				$('#menu').hide();
				// show the loading screen
				$('#loadingOverlay').show();
				$('#loadingOverlay .loadingMessage').show();
				$('#loadingOverlay .progressBar').show();
				loadGame();
			});

			// add a callback for credits and instructions
			// $('#instructionsButton').click(function(){}
			// $('#creditsButton').click(function(){}

			var loadGame = function(){
				console.log("Loading Game.");
				var progressCallback = function (handled, total) {
					var loadedPercent = (100*handled/total).toFixed();
					$('#loadingOverlay .progressBar .progress').css('width', loadedPercent+'%');
				};
				
				// The loader takes care of loading the data
				var loader = new DynamicLoader({
					world: Game.world,
					rootPath: 'res',
					progressCallback: progressCallback});
				RSVP.all([
					// load multiple bundles here in the array
					loader.loadFromBundle('project.project', 'Warrior.bundle', {recursive: false, preloadBinaries: true}),
					loader.loadFromBundle('project.project', 'Axe.bundle', {recursive: false, preloadBinaries: true}),
					loader.loadFromBundle('project.project', 'Spider.bundle', {recursive: false, preloadBinaries: true})
				]).
				then(function(){
					// show what was loaded
					console.log(loader._configs);
					Game.viewCam = Game.world.createEntity("View Cam");
					Game.viewCam.addToWorld();
					Game.viewCam.setComponent(new CameraComponent(new Camera(30, 1, 0.1, 1000)));

					Game.userEntity = loader.getCachedObjectForRef("warriorIdle/entities/RootNode.entity");
					Game.userEntity.targetPosition = new Vector3();
					Game.userEntity.transformComponent.setTranslation(5,0,-2);
					Game.userEntity.transformComponent.setUpdated();
					
					Game.basic2hAxe = loader.getCachedObjectForRef("Basic_2h_Axe/entities/Box04_0.entity");
					Game.basic2hAxe.transformComponent.transform.rotation.fromAngles(0,0,65*(Math.PI/180));
					Game.basic2hAxe.skip = true;
					Game.basic2hAxe.transformComponent.setUpdated();

					Game.basic2hAxe.hitMask = 1;
					Game.basic2hAxe.objType = "Weapon";

					var enemy = loader.getCachedObjectForRef("Spider/entities/RootNode.entity");
					enemy.transformComponent.setTranslation(-5, 0, -2);
					enemy.transformComponent.transform.rotation.fromAngles(0,45*(Math.PI/180),0);
					enemy.transformComponent.children[0].entity.hitMask = 1;
					enemy.objType = "Enemy";
					
					Game.hands = loader.getCachedObjectForRef("warriorIdle/entities/Base_Gloves_0.entity");

					Game.viewCam.transformComponent.setTranslation(DistanceElevationHeading(20, 70*(Math.PI/180), 0*(Math.PI/180)));
					Game.viewCam.transformComponent.lookAt(Vector3.ZERO, Vector3.UNIT_Y);

					$('#loadingOverlay').hide();
					$('#loadingOverlay .loadingMessage').hide();
					$('#loadingOverlay .progressBar').hide();
					// start the game
					startGame();
				}).
				then(null, function(e){
					alert("Failed to load scene: "+e);
					console.log(e.stack);
				});
			};
			var startGame = function(){
				$('#goo').show();
				var toolTips = {0:true, 1:true};
				Input.assignMouseButtonToAction(1, "Click");
				Game.userEntity.speed = 5;
				Game.userEntity.targetPosition.copy(Game.userEntity.transformComponent.transform.translation);
				Game.userEntity.pickUpAxe = function(){
					if(toolTips[1]){
						toolTips[1] = false;
						alert("To Drop, Press Space");
					}
					Game.basic2hAxe.hitMask = 0;
					Game.userEntity.weapon = "Axe";
					Attachment.attach(Game.basic2hAxe, Game.hands, "Bip01 R Hand", new Vector3(0,0,0), new Vector3(0.5*Math.PI,0,0), new Vector3(1,1,1));
				}

				Game.userEntity.dropAxe = function(bool0){
					if(false == bool0){return;}
					Game.basic2hAxe.hitMask = 1;
					Game.userEntity.weapon = null;
					Attachment.remove(Game.basic2hAxe, Game.hands);
					Game.basic2hAxe.transformComponent.transform.translation.y = 0;
					Game.basic2hAxe.transformComponent.setUpdated();
				}
				Game.userEntity.lastAction = 0.0;
				Game.userEntity.warriorUpdate = function(){
					this.wantDir = Vector3.sub(Game.userEntity.targetPosition, Game.userEntity.transformComponent.transform.translation);
					var distance = this.wantDir.length();
					if(distance > 0){
						this.transformComponent.transform.rotation.lookAt(this.wantDir, Vector3.UNIT_Y);
					}
					
					switch(this.targetType){
						case "Weapon":
							if(distance > 1.5){
								var oldX = Game.userEntity.transformComponent.transform.translation.x;
								var oldZ = Game.userEntity.transformComponent.transform.translation.z;
								oldX += (this.wantDir.x/distance)*this.speed*Time.dt;
								oldZ += (this.wantDir.z/distance)*this.speed*Time.dt;
								this.transformComponent.setTranslation(oldX, 0, oldZ);
								Game.userEntity.animationComponent.transitionTo(Game.userEntity.animationComponent.getStates()[1]);
							}
							else{
								Game.userEntity.pickUpAxe();
								this.targetType = null;
							}
							break;
						case "Enemy":
							if(distance > 1.5){
								var oldX = Game.userEntity.transformComponent.transform.translation.x;
								var oldZ = Game.userEntity.transformComponent.transform.translation.z;
								oldX += (this.wantDir.x/distance)*this.speed*Time.dt;
								oldZ += (this.wantDir.z/distance)*this.speed*Time.dt;
								this.transformComponent.setTranslation(oldX, 0, oldZ);
								Game.userEntity.animationComponent.transitionTo(Game.userEntity.animationComponent.getStates()[1]);
							}
							else{
								if(Game.userEntity.weapon == "Axe"){
									if(this.lastAction < Time.time){
										this.lastAction = Time.time+1.0;
										this.animationComponent.transitionTo(this.animationComponent.getStates()[2]);
										this.targetType = null;
									}
								}
								else{
									if(toolTips[0]){
										toolTips[0] = false;
										Game.basic2hAxe.skip = false;
										alert("You Need A Weapon!");
									}
									this.animationComponent.transitionTo(this.animationComponent.getStates()[0]);
									this.targetType = null;
								}
							}
							break;
						case "Ground":
							if(distance > 0.5){
								var oldX = Game.userEntity.transformComponent.transform.translation.x;
								var oldZ = Game.userEntity.transformComponent.transform.translation.z;
								oldX += (this.wantDir.x/distance)*this.speed*Time.dt;
								oldZ += (this.wantDir.z/distance)*this.speed*Time.dt;
								this.transformComponent.setTranslation(oldX, 0, oldZ);
								Game.userEntity.animationComponent.transitionTo(Game.userEntity.animationComponent.getStates()[1]);
							}
							else{
								this.animationComponent.transitionTo(this.animationComponent.getStates()[0]);
							}
							break;
						default:
							if(this.lastAction < Time.time){
								this.animationComponent.transitionTo(this.animationComponent.getStates()[0]);
							}
							break;
						}
					this.transformComponent.setUpdated();
				}
				Input.assignKeyToAction(32, "SpaceBar");
				Game.register("SpaceBar", Game.userEntity, Game.userEntity.dropAxe);
				Game.register("Click", Game, checkMouseHit);
				Game.register("Update", Game.userEntity, Game.userEntity.warriorUpdate);
				
				Game.doRender = true;
			}

			var plane = new Plane(new Vector3(0,1,0), 0);
			var pos = new Vector3(0,0,0);
			var checkMouseHit = function(bool0){
				if(false == bool0){return;}
				Game.viewCam.cameraComponent.camera.getPickRay(
				   Input.mousePosition.x,
				   Input.mousePosition.y,
				   Game.renderer.viewportWidth,
				   Game.renderer.viewportHeight,
				   Game.ray);
				var hit = Game.castRay(Game.ray, 1);
				if(hit){
					//console.log(hit);
					while(hit.entity.transformComponent.parent){
						hit.entity = hit.entity.transformComponent.parent.entity;
					}
					Game.userEntity.targetPosition.copy(hit.entity.transformComponent.transform.translation);
					Game.userEntity.targetPosition.y = 0;
					Game.userEntity.targetType = hit.entity.objType;
					this.wantDir = Vector3.sub(Game.userEntity.targetPosition, Game.userEntity.transformComponent.transform.translation);
				}
				else{
					if(plane.rayIntersect(Game.ray, pos)){
						Game.userEntity.targetPosition.copy(pos);
						Game.userEntity.targetType = "Ground";
					}
				}
			};

			var DistanceElevationHeading = function(distance, elevation, heading, v0){
				var radH = (heading-(Math.PI*0.5)); // Mathf.Deg2Rad;
				var radE = elevation//*Mathf.Deg2Rad;
				var a = distance * Math.cos(radE);
				v0 = typeof v0 !== 'undefined' ? v0 : new Vector3();
				v0.x = a*Math.cos(radH);
				v0.y = distance*Math.sin(radE);
				v0.z = a*Math.sin(radH);
				return v0;
			};
		}
	}
	init();
});
