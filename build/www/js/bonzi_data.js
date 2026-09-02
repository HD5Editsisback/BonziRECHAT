
App_Bonzi.data_queue.push(function() { 
	var framerate = 0.5;
	App_Bonzi.data.bonzi = {
		size: {
			x: 200,
			y: 160
		},
		sprite: {
			images: [App_Bonzi.content_from_id("spritesheet_bonzi")],
			frames: {width: 200, height: 160},
			animations: {
				idle: 0,
				surf_intro: [1139, 1164, "idle", 0.5],
				surf_away: [1165, 1188, "gone", 0.5],
				gone: 1139,
				
				surf_across_fwd: [1203, 1211, "surf_across_still", 0.5],
				surf_across_still: 1211,
				surf_across_back: {
					frames: range(1212,1217),
					next: "idle",
					speed: 0.5
				},
				
				clap_fwd: [10, 12, "clap_still", 0.5],
				clap_still: [13, 15, "clap_still", 0.5],
				clap_back: {
					frames: range(12,10),
					next: "idle",
					speed: 0.5
				},
				write: {
					frames: [0,377,376,375,374,373,373,373,373,373,372,371,370,369,368,367,366,678,679,680,681,682,683,684,685,686,686,686,686,687,688,681,682,683,684,685,686,686,686,686,687,688,681,682,683,684,685,686,686,686,686,687,688,681,682,683,684,685,686,686,686,686,687,688,725,726,727,728,728,728,728,728,728,728,728,728,728,728,728,728,728,728,728,728,727,726,725,723,681,682,683,684,685,686,686,686,686,687,688,681,682,683,684,685,686,686,686,686,687,688,680,679,678,724,724,724,724,724,367,368,369,370,371,372,373,373,373,373,373,374,375,376,377,378,0],
					next: "idle",
					speed: 0.5
				},
				sleep_fwd: {
					frames: [0,507,508,509,510,511,511,511,511,511,511,511,511,511,511,511,511,511,511,511,510,509,507,507,507,507,507,507,507,507,507,507,507,507,508,508,509,510,511,512,512,512,512,512,512,512,512,512,512,512,512,512,512,511,510,510,510,510,510,510,510,510,510,510,510,510,510,510,511,512,513,514,515,515,515,515,515,515,515,515,515,515,515,515,515,515,515,516,517,518,519,520,521],
					next: "sleep_still",
					speed: 0.5
				},
				sleep_still: {
					frames: [521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,522,523,524,525,525,525,525,525,525,525,525,525,525,525,525,525,525,525,525,525,525,525,525,525,525,525,524,523,522,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521,521],
					next: "sleep_still",
					speed: 0.5
				},
				sleep_back: {
					frames: [526,527,528,529,530,531,532,533,534,535],
					next: "idle",
					speed: 0.5
				},
				banana_eat: {
					frames: [0,826,827,828,829,830,831,832,833,834,835,836,837,838,839,840,841,842,843,844,845,846,847,848,849,850,851,852,853,852,851,852,854,853,852,855,856,857,858,859,860,861,862,863,864,865,866,867,868,869,870,871,872,873,874,875,876,877,878,879,880,881,882,883,884,885,886,0],
					next: "idle",
					speed: 0.5
				},
				banana_eat_miss: {
					frames: [0,1024,1025,1026,1027,1028,1029,1030,1031,1032,1033,1034,1035,1036,1037,1038,1039,1040,1041,1042,1043,1043,1043,1043,1043,1043,1043,1043,1043,1043,1043,1044,1045,1046,1047,1047,1047,1047,1047,1047,1047,1047,1047,1050,1051,1052,1053,1053,1053,1053,1053,1053,1053,1053,1053,1053,1053,1052,1051,1050,1057,1054,1055,1056,1056,1056,1056,1056,1056,1056,1056,1056,1055,1054,1057,1058,1058,1058,1058,1058,1058,1059,1060,1058,1058,1058,1058,1058,1058,1058,1058,1058,1061,1062,1063,1064,1065,1066,1067,1068,1069,1070,1071,0],
					next: "idle",
					speed: 0.5
				},
				cool: {
					frames: [0,0,438,439,440,441,442,443,444,445,446,447,448,449,450,451,452,453,454,455,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,455,454,453,452,451,450,466,467,466,450,466,467,466,450,451,452,453,454,455,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,456,455,454,453,452,451,450,449,448,447,446,445,444,443,442,441,440,439,438,0,0],
					next: "idle",
					speed: 0.5
				},
				juggle: {
					frames:[0,643,644,645,646,647,647,647,648,649,650,651,652,653,654,655,656,657,658,655,656,657,658,655,656,657,658,655,656,657,658,655,656,657,658,655,656,657,658,655,656,657,658,655,656,657,658,655,656,657,658,655,656,657,658,655,656,657,658,655,656,657,658,655,656,657,658,655,656,657,658,655,656,657,658,655,656,657,658,659,660,661,661,661,661,661,661,650,649,648,647,647,647,646,645,644,643,0],
					next: "idle",
					speed: 0.6
				},
				
				look_left: {
					frames: [0,419,420,421,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,422,421,420,419],
					next: "idle",
					speed: 0.5
				},
				
				look_right: {
					frames: [0,1007,1008,1009,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1010,1009,1008,1007],
					next: "idle",
					speed: 0.5
				},
				
				look_down: {
					frames: [413,414,415,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,416,415,414,413],
					next: "idle",
					speed: 0.5
				},
				
				look_up: {
					frames: [0,425,426,427,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,428,427,426,425,0],
					next: "idle",
					speed: 0.5
				},
				
				breathe: {
					frames: [0,41,42,43,44,45,46,46,46,46,45,44,43,42,41,0],
					next: "idle",
					speed: 0.5
				},
				
				taptaptap: {
					frames: [0,999,1000,1001,1002,1002,1002,1002,1002,1002,1002,1001,1000,999,1003,1004,1005,1006,1006,1006,1006,1006,1006,1006,1006,1006,1005,1004,1003,0],
					next: "idle",
					speed: 0.5
				},
				
				yawn: {
					frames: [0,192,193,194,195,196,197,199,200,199,197,199,200,199,197,199,200,199,197,199,200,199,197,199,200,196,195,194,193,192,0],
					next: "idle",
					speed: 0.5
				},
				shrug_fwd: [28, 33, "shrug_still", 0.5],
				shrug_still: 33,
				shrug_back: {
					frames: range(33,28	),
					next: "idle",
					speed: 0.5				
				},

				
				grin_fwd: [1083, 1087, "grin_still", 0.5], 
				grin_still: 1087, 
				grin_back: { 
					frames: range(1087, 1083), 
					next: "idle", 
					speed: 0.5
				},
				
				praise_fwd: [151, 155, "praise_still", 1], 
				praise_still: 155, 
				praise_back: { 
					frames: range(155, 151), 
					next: "idle", 
					speed: 1 
				},
				backflip: [163, 175, "idle", 0.5]
			}
		},
		to_idle: {
			surf_across_fwd: "surf_across_back",
			surf_across_still: "surf_across_back",
			
			clap_fwd: "clap_back",
			clap_still: "clap_back",
			
			shrug_fwd: "shrug_back",
			shrug_still: "shrug_back",
			
			earth_fwd: "earth_back",
			earth_still: "earth_back",
			
			look_down_fwd: "look_down_back",
			look_down_still: "look_down_back",
			
			lean_left_fwd: "lean_left_back",
			lean_left_still: "lean_left_back",
			
			beat_fwd: "beat_back",
			beat_still: "beat_back",
			
			cool_fwd: "cool_back",
			cool_still: "cool_back",
			cool_adjust: "cool_back",
			
			cool_left_fwd: "cool_left_back",
			cool_left_still: "cool_left_back",
			
			present_fwd: "present_back",
			present_still: "present_back",
			
			sleep_fwd: "sleep_back",
			sleep_still: "sleep_back",
			
			look_left_fwd: "look_left_back",
			look_left_still: "look_left_back",
			
			look_right_fwd: "look_right_back",
			look_right_still: "look_right_back",
			
			lean_right_fwd: "lean_right_back",
			lean_right_still: "lean_right_back",
			
			praise_fwd: "praise_back",
			praise_still: "praise_back",
			
			grin_fwd: "grin_back",
			grin_still: "grin_back",
			
			backflip: "idle",
			
			breathe: "idle",
			taptaptap: "idle",
			
			look_left: "look_left_back",
			look_right: "look_right_back",
			look_down: "lean_right_back",
			cool: "cool_back",
			cool_peedy: "cool_back",

			idle: "idle",
		},
		event_list_joke_open: [
			[
				{
					type: "text",
					text: "OK {NAME}."
				}
			],[
				{
					type: "text",
					text: "OK, I've got a good one for you."
				}
			],[
				{
					type: "text",
					text: "OK, here goes."
				}
			],[
				{
					type: "text",
					text: "Anything for you {NAME}."
				}
			],[
				{
					type: "text",
					text: "Sure, I've got a ton of them."
				}
			],[
				{
					type: "text",
					text: "Not a problem."
				}
			],[
				{
					type: "text",
					text: "{NAME}? I didn't know you liked my jokes so much."
				}
			],[
				{
					type: "text",
					text: "OK, if you're sure."
				}			
			]
		],
		event_list_joke_mid: [
			[
				{
					type: "text",
					text: "Why do they call HTML HyperText?"
				},
				{
					type: "text",
					text: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
				},
				{
					type: "text",
					text: "Sorry for my sad crazy existence."
				},				
			],[
				{
					type: "text",
					text: "Two sausages are in a pan. One looks at the other and says \"Boy it's hot in here!\" and the other sausage says \"Unbelievable! It's a talking sausage!\" ",
					say: "Two sausages are in a pan. One looks at the other and says, Boy it's hot in here! and the other sausage says, Unbelievable! It's a talking sausage!"
				},
				{
					type: "text",
					text: "What are you except this? A 18+ joke? You're a retarded fuck!"
				},				
			],[
				{
					type: "text",
					text: "What is in the middle of Paris?"
				},
				{
					type: "text",
					text: "An giant inflattable buttplug."
				}
			],[
				{
					type: "text",
					text: "What do you call a cow that can't give milk?"
				},
				{
					type: "text",
					text: "An utter failure!"
				}
			],[
				{
					type: "text",
					text: "What do you call a cow that eats grass?"
				},
				{
					type: "text",
					text: "AAAAAAAAAAAAAAAASSSSSSSSSSSSSSSSSSSSSSSSSSS! FUUUUUUUUUUUUUUUUUUUUUUUUUUUUUCK!!!!!!!!!!!!"
				}
			],[
				{
					type: "text",
					text: "What type of water won't freeze?"
				},
				{
					type: "text",
					text: "OH SHIT THE FLOOR IS LAVA!"
				}
			],[
				{
					type: "text",
					text: "Who earns a living by driving his customers away?"
				},
				{
					type: "text",
					text: "Nintendo!"
				}
			],[
				{
					type: "text",
					text: "What did the digital clock say to the grandfather clock?"
				},
				{
					type: "text",
					text: "shut up old hag i don't want to be the HAHASMUYRDNRHYHNYRRYRGBYET type shit."
				}
			],[
				{
					type: "text",
					text: "What do you call a man who shaves 10 times a day?"
				},
				{
					type: "text",
					text: "A woman!"
				}
			],[
				{
					type: "text",
					text: "How do you get water in watermelons?"
				},
				{
					type: "text",
					text: "WAIT- WHAT- WHAR- WHAAAAAAAAT? AYOOOOOOOOOOOOOOOOOO-"
				}
			],[
				{
					type: "text",
					text: "Why do we call money bread?"
				},
				{
					type: "text",
					text: "Because we knead it!"
				}		
			],[
				{
					type: "text",
					text: "What color did pink and comes out blue?"
				},
				{
					type: "text",
					text: "Sonic's AYOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO WHAT THE FUUUUUUUUUUUUUUUUUUUUUU-"
				}						
			]
		],
		event_list_joke_end: [
			[
				{
					type: "text",
					text: "You know {NAME}, a good friend laughs at your jokes even when they're not so good."
				},
				{
					type: "text",
					text: "And you suck, thanks."
				}			
			],[
				{
					type: "text",
					text: "Where do I come up with these?"
				},
				{
					type: "text",
					text: "My fucking ass?"
				}
			],[
				{
					type: "text",
					text: "Do I amuse you, {NAME}? Am I funny? Do I make you laugh?"
				},
				{
					type: "text",
					text: "please respond"
				}				
			],[
				{
					type: "text",
					text: "Maybe I'll keep my day job, {NAME}... Pateron didn't accept me."
				}
			],[
				{
					type: "text",
					text: "Laughter is the best medicine!"
				},
				{
					type: "text",
					text: "Apart from meth."
				}				
			],[
				{
					type: "text",
					text: "Don't judge me on my sense of humor alone. Please."
				}
				{
					type: "text",
					text: "Help me! I'm embarassed!"
				}				
			]
		],

// ============================================================================

		event_list_fact_open: [
			[
				{
					type: "text",
					text: "OK {NAME}."
				}
			],[
				{
					type: "text",
					text: "OK, I've got a good one for you."
				}
			],[
				{
					type: "text",
					text: "OK, here goes."
				}
			],[
				{
					type: "text",
					text: "Anything for you {NAME}."
				}
			],[
				{
					type: "text",
					text: "Sure, I've got a ton of them."
				}
			],[
				{
					type: "text",
					text: "Not a problem."
				}
			],[
				{
					type: "text",
					text: "OK, if you're sure."
				}
			]
		],

		event_list_fact_mid: [
			[
				{
					type: "anim",
					anim: "earth_fwd",
					ticks: 15
				},
				{
					type: "text",
					text: "Did you know that Uranus is 31,518 miles (50,724 km) in diameter?",
					say: "Did you know that Yer Anus is 31 thousand 500 and 18 miles in diameter?",
				},
				{
					type: "anim",
					anim: "earth_back",
					ticks: 15
				},
				{
					type: "anim",
					anim: "grin_fwd",
					ticks: 15
				}
                {
					type: "anim",
					anim: "earth_fwd",
					ticks: 15
				},
				{
					type: "text",
					text: "Did you know it was originally a fork of many BonziWORLD servers inlucding .gay and .kr?",
				},
				{
					type: "anim",
					anim: "earth_back",
					ticks: 15
				},		
			]
		],

		event_list_fact_end: [
			[
				{
					type: "text",
					text: "o gee whilickers wasn't that sure interesting huh"
				},
				{
					type: "idle"
				}
			]
		],
		
		event_list_talk_open: [
			[ 
				{
					type: "text",
					text: "{NAME}! Where did the time go?"
				}
			],
			[
				{
					type: "text",
					text: "So {NAME}, what are you currently working on?"
				}
			],
			[
				{
					type: "text",
					text: "Gee, I never had a best friend before!"
				}
			],
			[
				{
					type: "text",
					text: "Hey {NAME}! Do you know how much I enjoy your company?"
				}
			],
			[			
				{
					type: "anim",
					anim: "shrug_fwd",
					ticks: 15
				},
				{
					type: "text",
					text: "I love you, You love me, We are a happy family!"
				},
				{
					type: "idle"
				},
				{
					type: "text",
					text: "That's my message to you for being my best friend!"
				}
			]
		],
	};

	App_Bonzi.data.bonzi.event_list_joke = [
		{
			type: "add_random",
			add: App_Bonzi.data.bonzi.event_list_joke_open
		},
		{
			type: "anim",
			anim: "shrug_fwd",
			ticks: 15
		},
		{
			type: "add_random",
			add: App_Bonzi.data.bonzi.event_list_joke_mid
		},
		{
			type: "idle"
		},
		{
			type: "add_random",
			add: App_Bonzi.data.bonzi.event_list_joke_end
		},
		{
			type: "idle"
		}
	];


	App_Bonzi.data.bonzi.event_list_talk = [
		{
			type: "add_random",
			add: App_Bonzi.data.bonzi.event_list_talk_open
		},
		{
			type: "idle"
		}
	];
	App_Bonzi.data.bonzi.event_list_fact = [
		{
			type: "add_random",
			add: App_Bonzi.data.bonzi.event_list_fact_open
		},
		{
			type: "add_random",
			add: App_Bonzi.data.bonzi.event_list_fact_mid
		},
		{
			type: "idle"
		},
		{
			type: "add_random",
			add: App_Bonzi.data.bonzi.event_list_fact_end
		},
		{
			type: "idle"
		}
	];
});
