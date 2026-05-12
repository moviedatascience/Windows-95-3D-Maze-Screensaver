var canvas;
var gl;
var program;
var startTime = new Date();

//EDITABLE CONSTANTS
const MzX = 10; //X dimension of Maze
const MzY = 10; //Y dimension of Maze
var PICNUM = 3; //number of picture walls
var DEAD_END_FREQ = 1; //show a dead-end image at 1 in every N dead ends (1=all, 2=half, 3=every third…)
var DEADENDPICNUM = 0; //total dead-end picture walls (computed each maze)
var POLYNUM = 6; //number of polyhedra
var OPENNUM = 3; //number of floating opengl's
var RATNUM = 5; //number of rats

POLYNUM = Math.min(POLYNUM,MzX*MzY-4);
OPENNUM = Math.min(OPENNUM,MzX*MzY-4-POLYNUM);
RATNUM  = Math.min(RATNUM, MzX*MzY-4-POLYNUM-OPENNUM);

var openplaces;
var SX, SY;
var SX1, SY1;
var maze;
var theta, dtheta;

var polypos,openpos;
var FinX, FinY;

var eyeX, eyeY;
var deyeX, deyeY;

var rats = []; // each element: [theta, X, Y, dtheta, dX, dY]

var height =0;

var near = 0.01;
var far = 50.0;
var fovy = 90;  // Field-of-view in Y direction angle (in degrees)
var aspect;     // Viewport aspect ratio
var eye, at, up;

var modelViewMatrix, projectionMatrix, scaleMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, scaleMatrixLoc;

var NumVertices;
var elgible;

var deadEndTextures = []; // WebGL texture objects loaded from pic1.bmp, pic2.bmp, ...
var deadEndPicCounts = []; // number of dead-end wall quads per texture
var picGlTexture = null;  // WebGL texture object for pic.bmp (random wall pics)

var lighting;

var texSize = 64;

var pointsArray, colorsArray, texCoordsArray;

var texCoord = [
	[vec2(0, 0),
    vec2(0, 1),
    vec2(1, 1),
    vec2(1, 0)],
    [vec2(0, 0),
    vec2(0, MzX),
    vec2(MzY, MzX),
    vec2(MzY, 0)],
];

var vertexColors = [
    vec4( 0.0, 0.0, 0.0, 1.0 ),  // black
    vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
    vec4( 1.0, 1.0, 0.0, 1.0 ),  // yellow
    vec4( 0.0, 1.0, 0.0, 1.0 ),  // green
    vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
    vec4( 1.0, 0.0, 1.0, 1.0 ),  // magenta
    vec4( 0.0, 1.0, 1.0, 1.0 ),  // cyan
    vec4( 1.0, 1.0, 1.0, 1.0 ),  // white
];


function resizeCanvas() {
	canvas.width  = window.innerWidth;
	canvas.height = window.innerHeight;
	gl.viewport( 0, 0, canvas.width, canvas.height );
	aspect =  canvas.width/canvas.height;
}
    

window.onload = function() {


    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

	window.addEventListener('resize', resizeCanvas, false);
	resizeCanvas();
    
    gl.clearColor( 0, 0, 0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);    
    

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );    

	resetVars();

	gl.enable(gl.CULL_FACE);

    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    scaleMatrixLoc = gl.getUniformLocation( program, "scaleMatrix" );

	gl.uniform1i(gl.getUniformLocation(program, "wall"), 0);
	gl.uniform1i(gl.getUniformLocation(program, "floor"), 1);
	gl.uniform1i(gl.getUniformLocation(program, "ceiling"), 2);
	gl.uniform1i(gl.getUniformLocation(program, "pic"), 3);
	gl.uniform1i(gl.getUniformLocation(program, "start"), 4);
	gl.uniform1i(gl.getUniformLocation(program, "fin"), 5);
	gl.uniform1i(gl.getUniformLocation(program, "open"), 6);
	gl.uniform1i(gl.getUniformLocation(program, "rat"), 7);
	gl.uniform1i(gl.getUniformLocation(program, "emote"), 8);

    //
    // Initialize textures
    //

    const wallImg = new Image();
	wallImg.onload = function() {
  		const wallTexture = gl.createTexture();
  		gl.activeTexture(gl.TEXTURE0);
  		gl.bindTexture(gl.TEXTURE_2D, wallTexture);
  		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, wallImg);
  		gl.generateMipmap(gl.TEXTURE_2D);

  		const floorImg = new Image();
		floorImg.onload = function() {
			const floorTexture = gl.createTexture();
			gl.activeTexture(gl.TEXTURE0+1);
			gl.bindTexture(gl.TEXTURE_2D, floorTexture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, floorImg);
			gl.generateMipmap(gl.TEXTURE_2D);

			const ceilingImg = new Image();
			ceilingImg.onload = function() {
				const ceilingTexture = gl.createTexture();
				gl.activeTexture(gl.TEXTURE0+2);
				gl.bindTexture(gl.TEXTURE_2D, ceilingTexture);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, ceilingImg);
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

				const picImg = new Image();
				picImg.onload = function() {
					const picTexture = gl.createTexture();
					gl.activeTexture(gl.TEXTURE0+3);
					gl.bindTexture(gl.TEXTURE_2D, picTexture);
					gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, picImg);
					gl.generateMipmap(gl.TEXTURE_2D);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
					picGlTexture = picTexture;

					const startImg = new Image();
					startImg.onload = function() {
						const startTexture = gl.createTexture();
						gl.activeTexture(gl.TEXTURE0+4);
						gl.bindTexture(gl.TEXTURE_2D, startTexture);
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, startImg);
						gl.generateMipmap(gl.TEXTURE_2D);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

						const finImg = new Image();
						finImg.onload = function() {
							const finTexture = gl.createTexture();
							gl.activeTexture(gl.TEXTURE0+5);
							gl.bindTexture(gl.TEXTURE_2D, finTexture);
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, finImg);
							gl.generateMipmap(gl.TEXTURE_2D);
							gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
						
							const openImg = new Image();
							openImg.onload = function() {
								const openTexture = gl.createTexture();
								gl.activeTexture(gl.TEXTURE0+6);
								gl.bindTexture(gl.TEXTURE_2D, openTexture);
								gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, openImg);
								gl.generateMipmap(gl.TEXTURE_2D);
								gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	
								const ratImg = new Image();
								ratImg.onload = function() {
									const ratTexture = gl.createTexture();
									gl.activeTexture(gl.TEXTURE0+7);
									gl.bindTexture(gl.TEXTURE_2D, ratTexture);
									gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ratImg);
									gl.generateMipmap(gl.TEXTURE_2D);
									gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

									const emoteImg = new Image();
									emoteImg.onload = function() {
										const emoteTexture = gl.createTexture();
										gl.activeTexture(gl.TEXTURE0+8);
										gl.bindTexture(gl.TEXTURE_2D, emoteTexture);
										gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, emoteImg);
										gl.generateMipmap(gl.TEXTURE_2D);
										gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

									// Probe for pic1.bmp, pic2.bmp, … — stop at the first missing file
									function loadDeadEndTextures(index) {
										var img = new Image();
										img.onload = function() {
											var tex = gl.createTexture();
											gl.activeTexture(gl.TEXTURE3);
											gl.bindTexture(gl.TEXTURE_2D, tex);
											gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
											gl.generateMipmap(gl.TEXTURE_2D);
											gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
											deadEndTextures.push(tex);
											loadDeadEndTextures(index + 1);
										};
										img.onerror = function() { resetVars(); render(); };
										img.src = './pic' + index + '.bmp';
									}
									loadDeadEndTextures(1);
									};
									emoteImg.src = './emote.png';
								};
								ratImg.src = './rat.png';
							};
							openImg.src = './gl.png'; 
						};
						finImg.src = './fin.png'; 
					};
					startImg.src = './start2.png'; 
				};
				picImg.src = './pic.bmp'; 
			};
			ceilingImg.src = './ceiling2.bmp';
		};
		floorImg.src = './floor.bmp';
	};
	wallImg.src = './wall.bmp';    
	       
}

function resetVars() {

	lighting=0;

	maze = newMaze(MzX,MzY);

	SX=0;
	SY=0;

	openplaces = [];
	for (var i=0;i<MzX;i++){
		for (var j=0;j<MzY;j++){
			openplaces.push([i,j]);
		}
	}
	[SX,SY]=openplaces.splice(Math.floor(Math.random() * openplaces.length),1)[0];

	eyeX = SX+.5;
	eyeY = SY+.5;
	deyeX = 0;
	deyeY = 0;
	dtheta = 0;

	SX1 = SX;
	SY1 = SY;

	rats=[];

	//don't start facing a wall
	if (maze[SY][SX][1]!=1){
		if (maze[SY][SX][0]==1){
			theta=-90/180*Math.PI;
			SY1=SY-1;
		} else if (maze[SY][SX][2]==1){
			theta=90/180*Math.PI;
			SY1=SY+1;
		} else {
			theta=Math.PI;
			SX1=SX-1;
		}
	} else {
		theta=0;
		SX1=SX+1;
	}

	for(var i=0;i<openplaces.length;i++){
		if (openplaces[i][0]==SX1 && openplaces[i][1]==SY1){
			openplaces.splice(i,1);
			break;
		}
	}
	
	polypos=[]
	for (var i=0;i<POLYNUM;i++){
		polypos.push(openplaces.splice(Math.floor(Math.random() * openplaces.length),1)[0].concat([Math.floor(Math.random() * 4)]));
	}

	openpos=[]
	for (var i=0;i<OPENNUM;i++){
		openpos.push(openplaces.splice(Math.floor(Math.random() * openplaces.length),1)[0]);
	}

	[FinX,FinY] = openplaces.splice(Math.floor(Math.random() * openplaces.length),1)[0];
	
	for (var i=0; i<RATNUM; i++) {
		var rpos = openplaces.splice(Math.floor(Math.random() * openplaces.length),1)[0];
		rats.push([0, rpos[0]+.5, rpos[1]+.5, 0, 0, 0]);
	}
	up = vec3(0.0, 0.0, 1.0);
	
	NumVertices=0;
	elgible=[];
	for(var i=0;i<maze.length;i++){
		for (var j=0;j<maze[0].length;j++){
			for (var k=0;k<4;k++){
				if (!maze[i][j][k])
				{
					NumVertices+=6;
					elgible.push([i,j,k]);
				}
			}
		}
	}

	// Find dead ends (exactly one open passage) and collect the wall that faces into the dead end
	var deadEndFacingWalls = [];
	for (var i = 0; i < MzY; i++) {
		for (var j = 0; j < MzX; j++) {
			var openCount = 0, openDir = -1;
			for (var k = 0; k < 4; k++) {
				if (maze[i][j][k] == 1) { openCount++; openDir = k; }
			}
			if (openCount == 1) {
				// The facing wall is directly opposite the only open passage
				deadEndFacingWalls.push([i, j, (openDir + 2) % 4]);
			}
		}
	}
	// Fisher-Yates shuffle so the 1-in-3 selection is random
	for (var i = deadEndFacingWalls.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var tmp = deadEndFacingWalls[i];
		deadEndFacingWalls[i] = deadEndFacingWalls[j];
		deadEndFacingWalls[j] = tmp;
	}
	// Mark 1 in every DEAD_END_FREQ dead ends (skip entirely if no dead-end textures were found)
	DEADENDPICNUM = deadEndTextures.length ? Math.floor(deadEndFacingWalls.length / Math.max(1, DEAD_END_FREQ)) : 0;
	deadEndPicCounts = new Array(deadEndTextures.length).fill(0);
	for (var i = 0; i < DEADENDPICNUM; i++) {
		var pos = deadEndFacingWalls[i];
		var texIdx = Math.floor(Math.random() * deadEndTextures.length);
		deadEndPicCounts[texIdx]++;
		// Encode texture index in maze value: 4 = first image, 5 = second, etc.
		maze[pos[0]][pos[1]][pos[2]] = 4 + texIdx;
		// Remove from elgible so regular PICNUM selection doesn't double-assign this face
		for (var j = 0; j < elgible.length; j++) {
			if (elgible[j][0]==pos[0] && elgible[j][1]==pos[1] && elgible[j][2]==pos[2]) {
				elgible.splice(j, 1);
				break;
			}
		}
	}

	if (PICNUM > elgible.length)
		PICNUM = elgible.length;
	for(var i=0; i<PICNUM;i++) {
		var pos = elgible.splice(Math.floor(Math.random() * elgible.length),1)[0];
		maze[pos[0]][pos[1]][pos[2]]=3;
	}
	
	pointsArray = [];
	colorsArray = [];
	texCoordsArray = [];

    mazevertices();        

    //
    //  Load shaders and initialize attribute buffers
    //
    gl.useProgram( program );

    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW );
    
    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW );
    
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );
	
	var tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW );

	var vTexCoord = gl.getAttribLocation( program, "vTexCoord" );
	gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
	gl.enableVertexAttribArray( vTexCoord );

}

function mazevertices()
{
	
	quad([MzX,0,0,1],[MzX,MzY,0,1],[0,MzY,0,1],[0,0,0,1],1,0);
	quad([0,0,1,1],[0,MzY,1,1],[MzX,MzY,1,1],[MzX,0,1,1],1,0);
	// [top, right, bottom, left]
	for (var i = 0; i < maze.length; i++) {
		for(var j = 0; j < maze[0].length; j++) {
			var vertices = [
				vec4( j  , i  , 1.0, 1.0 ),
				vec4( j  , i+1, 1.0, 1.0 ),
				vec4( j+1, i+1, 1.0, 1.0 ),
				vec4( j+1, i  , 1.0, 1.0 ),
				vec4( j  , i  , 0.0, 1.0 ),
				vec4( j  , i+1, 0.0, 1.0 ),
				vec4( j+1, i+1, 0.0, 1.0 ),
				vec4( j+1, i  , 0.0, 1.0 )
			];
			if (!maze[i][j][0])
				quad(vertices[0],vertices[3],vertices[7],vertices[4],0,1);
			if (!maze[i][j][1])
				quad(vertices[6],vertices[7],vertices[3],vertices[2],0,0);
			if (!maze[i][j][2])
				quad(vertices[5],vertices[6],vertices[2],vertices[1],0,0);
			if (!maze[i][j][3])
				quad(vertices[4],vertices[5],vertices[1],vertices[0],0,0);	
			if (maze[i][j][0]==3)
				quad(vertices[0],vertices[3],vertices[7],vertices[4],3,1);
			if (maze[i][j][1]==3)
				quad(vertices[6],vertices[7],vertices[3],vertices[2],3,0);
			if (maze[i][j][2]==3)
				quad(vertices[5],vertices[6],vertices[2],vertices[1],3,0);
			if (maze[i][j][3]==3)
				quad(vertices[4],vertices[5],vertices[1],vertices[0],3,0);
		}
	}

	// Process dead-end walls grouped by texture in reverse order so texture 0 lands first in buffer
	for (var t = deadEndTextures.length - 1; t >= 0; t--) {
		for (var i = 0; i < maze.length; i++) {
			for (var j = 0; j < maze[0].length; j++) {
				if (maze[i][j][0]==4+t || maze[i][j][1]==4+t || maze[i][j][2]==4+t || maze[i][j][3]==4+t) {
					var dv = [
						vec4( j  , i  , 1.0, 1.0 ),
						vec4( j  , i+1, 1.0, 1.0 ),
						vec4( j+1, i+1, 1.0, 1.0 ),
						vec4( j+1, i  , 1.0, 1.0 ),
						vec4( j  , i  , 0.0, 1.0 ),
						vec4( j  , i+1, 0.0, 1.0 ),
						vec4( j+1, i+1, 0.0, 1.0 ),
						vec4( j+1, i  , 0.0, 1.0 )
					];
					if (maze[i][j][0]==4+t) quad(dv[0],dv[3],dv[7],dv[4],3,1);
					if (maze[i][j][1]==4+t) quad(dv[6],dv[7],dv[3],dv[2],3,0);
					if (maze[i][j][2]==4+t) quad(dv[5],dv[6],dv[2],dv[1],3,0);
					if (maze[i][j][3]==4+t) quad(dv[4],dv[5],dv[1],dv[0],3,0);
				}
			}
		}
	}

	quad([0,.5,0,1],[0,-.5,0,1],[0,-.5,1,1],[0,.5,1,1],0,0);
}

function quad(a, b, c, d,t,f)
{
//t0 = wall, t1=floor/ceilings, t3=pic
//f0 = dont flip, f1=flip

	var indices = [ a, b, c, a, c, d ];
	var indices2 = [1,2,3,1,3,0];

	if (t==3){
		for ( var i = 0; i < indices.length; ++i ) {
			pointsArray.splice(12+i, 0, indices[i]);
			colorsArray.splice(12+i,0,vertexColors[7]);
			texCoordsArray.splice(12+i,0,texCoord[0][(indices2[i]+2*(f))%4]);
		}
		return;
	}

    for ( var i = 0; i < indices.length; ++i ) {
        pointsArray.push( indices[i] );
		colorsArray.push(vertexColors[7]);
		texCoordsArray.push(texCoord[t][(indices2[i]+2*(f&&!t))%4]);
    }
}

var render = function(){

	document.body.onkeyup = function(e){
		if(e.keyCode == 32){
			lighting=!lighting;
		}
	}
	canvas.addEventListener("mousemove", function() {
		var curTime = new Date();
		if (curTime-startTime>3000){
			window.location.href = "desktop/index.html"
			startTime = curTime;
		}
	});


	gl.uniform1i(gl.getUniformLocation(program, "lighting"),lighting);

		
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    eye = vec3(eyeX,eyeY ,1/3)

	at = add(eye,vec3(Math.cos(theta),Math.sin(theta),0));
	     
    modelViewMatrix = lookAt(eye, at , up);
    projectionMatrix = perspective(fovy, aspect, near, far);
    scaleMatrix = scalem(1,1,3/4);

    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );
    gl.uniformMatrix4fv( scaleMatrixLoc, false, flatten(scaleMatrix) );
    
    gl.uniform4f(gl.getUniformLocation(program, "cameraPos"),eyeX,eyeY ,1/3,1);
            
    gl.uniform1i(gl.getUniformLocation(program, "i"),1);
	gl.drawArrays( gl.TRIANGLES, 0, 6 );
    gl.uniform1i(gl.getUniformLocation(program, "i"),2);
	gl.drawArrays( gl.TRIANGLES, 6, 6 );	
    if (!Math.round((FinX+.5-eyeX)*1000)/1000 && !Math.round((FinY+.5-eyeY)*1000)/1000) {
    	height-=.02;
		scaleMatrix=scalem(1,1,height);		
	    gl.uniformMatrix4fv( scaleMatrixLoc, false, flatten(scaleMatrix) );
	    if (height<0)
	    	resetVars();
    } else if (height<3/4) {
		height+=.02;
		scaleMatrix=scalem(1,1,height);		
	    gl.uniformMatrix4fv( scaleMatrixLoc, false, flatten(scaleMatrix) );
	} else if (Math.round(Math.abs(up[2])*10000)/10000-1){
		if (((Math.round(theta/Math.PI*180 *10000)/10000 %360 /90)+5)%2) {
			up=vec3(mult(rotateX(2),vec4(up)));
		} else {
			up=vec3(mult(rotateY(2),vec4(up)));			
		}
	} else { 
		[theta,eyeX,eyeY,dtheta,deyeX,deyeY]=nextMove(theta,eyeX,eyeY,dtheta,deyeX,deyeY);
		[theta,eyeX,eyeY,dtheta,deyeX,deyeY]=nextMove(theta,eyeX,eyeY,dtheta,deyeX,deyeY);
	}
	for (var r=0; r<rats.length; r++) {
		rats[r] = nextMove(...rats[r]);
		while (rats[r][3]) { rats[r] = nextMove(...rats[r]); }
	}
    // Draw each dead-end texture group, then the random pic walls, then plain walls
    var deOffset = 12;
    for (var t = 0; t < deadEndTextures.length; t++) {
    	if (deadEndPicCounts[t] > 0) {
    		gl.activeTexture(gl.TEXTURE3);
    		gl.bindTexture(gl.TEXTURE_2D, deadEndTextures[t]);
    		gl.uniform1i(gl.getUniformLocation(program, "i"), 3);
    		gl.drawArrays(gl.TRIANGLES, deOffset, deadEndPicCounts[t]*6);
    		deOffset += deadEndPicCounts[t]*6;
    	}
    }
    if (PICNUM > 0) {
    	gl.activeTexture(gl.TEXTURE3);
    	gl.bindTexture(gl.TEXTURE_2D, picGlTexture);
    	gl.uniform1i(gl.getUniformLocation(program, "i"), 3);
    	gl.drawArrays(gl.TRIANGLES, 12+DEADENDPICNUM*6, PICNUM*6);
    }
    gl.uniform1i(gl.getUniformLocation(program, "i"),0);
	gl.drawArrays( gl.TRIANGLES, 12+(PICNUM+DEADENDPICNUM)*6, NumVertices-(PICNUM+DEADENDPICNUM)*6);
    
    gl.uniform1i(gl.getUniformLocation(program, "i"),4);
   	scaleMatrix=mult(scalem(1,1,height),mult(translate(SX1+.5,SY1+.5,0),rotateZ(theta/Math.PI*180)));
    gl.uniformMatrix4fv( scaleMatrixLoc, false, flatten(scaleMatrix) );
	gl.drawArrays( gl.TRIANGLES, NumVertices+12,6);
    gl.uniform1i(gl.getUniformLocation(program, "i"),5);
   	scaleMatrix=mult(scalem(1,1,height),mult(translate(FinX+.5,FinY+.5,0),mult(rotateZ(theta/Math.PI*180),scalem(.75,.75,.75))));
    gl.uniformMatrix4fv( scaleMatrixLoc, false, flatten(scaleMatrix) );
	gl.drawArrays( gl.TRIANGLES, NumVertices+12,6);
	gl.uniform1i(gl.getUniformLocation(program, "i"),6);
    for (i=0;i<openpos.length;i++){
		scaleMatrix=mult(scalem(1,1,height),mult(translate(openpos[i][0]+.5,openpos[i][1]+.5,0),rotateZ(theta/Math.PI*180)));    	
		gl.uniformMatrix4fv( scaleMatrixLoc, false, flatten(scaleMatrix) );
		gl.drawArrays( gl.TRIANGLES, NumVertices+12,6);
    }
    gl.uniform1i(gl.getUniformLocation(program, "i"),7);
    for (var r=0; r<rats.length; r++) {
   		scaleMatrix=mult(scalem(1,1,height),mult(translate(rats[r][1],rats[r][2],0),mult(rotateZ(theta/Math.PI*180),scalem(.75,.75,.75))));
    	gl.uniformMatrix4fv( scaleMatrixLoc, false, flatten(scaleMatrix) );
		gl.drawArrays( gl.TRIANGLES, NumVertices+12,6);
    }
    gl.uniform1i(gl.getUniformLocation(program, "i"),8);
    for (i=0;i<polypos.length;i++){
		scaleMatrix=mult(scalem(1,1,height),mult(translate(polypos[i][0]+.5,polypos[i][1]+.5,0),mult(rotateZ(theta/Math.PI*180),scalem(.75,.75,.75))));
	    gl.uniformMatrix4fv( scaleMatrixLoc, false, flatten(scaleMatrix) );
		gl.drawArrays( gl.TRIANGLES, NumVertices+12, 6);
    	if (!Math.round((polypos[i][0]+.5-eyeX)*1000)/1000 && !Math.round((polypos[i][1]+.5-eyeY)*1000)/1000) {
			if (((Math.round(theta/Math.PI*180 *10000)/10000 %360 /90)+5)%2) {
				up=vec3(mult(rotateX(2),vec4(up)));
			} else {
				up=vec3(mult(rotateY(2),vec4(up)));
			}
			polypos.splice(i,1);
    	}
	}
    requestAnimFrame(render);
}


function nextMove(theta,X,Y,dtheta,dX,dY)
{
	var degtheta=Math.round(theta/Math.PI*180 *10000)/10000
	X=Math.round(X*10000)/10000;
	Y=Math.round(Y*10000)/10000;
	if (degtheta %90) {
		return [theta+dtheta,X,Y,dtheta,dX,dY];
	} else if ((X+.5)%1 || (Y+.5)%1) {
		return [theta,X+dX,Y+dY,dtheta,dX,dY];
	} else {//new move
		var direction = ((degtheta %360 /90)+5 )%4;		
		var walls = maze[Y-.5][X-.5];
		//[-Y,+X,+Y,-X]
		//[ 0, 1, 2, 3]
		// turn right = theta minus = <--
		//
		//strategy: 
		//just-turned and front=open - foward
		//right=open - rotate right
		//front=open - foward
		//left=open - rotate left
		//else i.e. dead end - rotate right
		if (dtheta && walls[direction]==1) {
			dX = ((direction==1)-(direction==3))/100;
			dY = ((direction==2)-(direction==0))/100;
			return [theta,X+dX,Y+dY,0,dX,dY];
		} else if (walls[(direction+3)%4]==1) {
			dtheta=-1 * Math.PI/180.0;
			return [theta+dtheta,X,Y,dtheta,0,0];
		} else if (walls[direction]==1){
			dX = ((direction==1)-(direction==3))/100;
			dY = ((direction==2)-(direction==0))/100;
			return [theta,X+dX,Y+dY,0,dX,dY];
		} else if (walls[(direction+1)%4]==1){
			dtheta=1 * Math.PI/180.0;
			return [theta+dtheta,X,Y,dtheta,0,0];
		} else {
			dtheta=-1 * Math.PI/180.0;
			return [theta+dtheta,X,Y,dtheta,0,0];
		}		
	}
}


function newMaze(x, y) { //https://www.dstromberg.com/2013/07/tutorial-random-maze-generation-algorithm-in-javascript/
	var totalCells = x*y;
    var cells = new Array();
    var unvis = new Array();

    //initilize arrays	
	for (var i = 0; i < y; i++) {
		cells[i] = new Array();
		unvis[i] = new Array();
		for (var j = 0; j < x; j++) {
			cells[i][j] = [0,0,0,0];
			unvis[i][j] = true;
		}
	}

	//set starting position
	var currentCell = [Math.floor(Math.random()*y), Math.floor(Math.random()*x)];

	var path = [currentCell];
	unvis[currentCell[0]][currentCell[1]] = false;
	var visited = 1;
	
	
	while (visited < totalCells) {
		//generate array of valid unvisited neighbor cells
		var potential = [[currentCell[0]-1, currentCell[1], 0, 2],	// top
						[currentCell[0], currentCell[1]+1, 1, 3],	// right
				        [currentCell[0]+1, currentCell[1], 2, 0],	// bottom
				        [currentCell[0], currentCell[1]-1, 3, 1]];	// left
		var neighbors = new Array();
		for (var l = 0; l < 4; l++) {
			if (potential[l][0] > -1 && potential[l][0] < y && potential[l][1] > -1 && potential[l][1] < x && unvis[potential[l][0]][potential[l][1]]) {
				neighbors.push(potential[l]);
			}
		}
		//remove the border to a neighboring cell and visit it
		if (neighbors.length) {
			var next = neighbors[Math.floor(Math.random()*neighbors.length)];
			cells[currentCell[0]][currentCell[1]][next[2]] = 1;
			cells[next[0]][next[1]][next[3]] = 1;
			
			unvis[next[0]][next[1]] = false;
			visited++;
			
			currentCell = [next[0], next[1]];
			path.push(currentCell);
		} else {
		    currentCell = path.pop();
		}
	}
	
    return cells;
}
