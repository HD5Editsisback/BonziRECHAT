
App_Bonzi.data_queue.push(function() { 
	var framerate = 0.6;
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
				
				surf_across_fwd: [1, 8, "surf_across_still", framerate],
				surf_across_still: 9, 
				surf_across_back: {
					frames: App_Bonzi.range(8,1),
					next: "idle",
					speed: framerate
				},
				
				clap_fwd: [10, 12, "clap_still", framerate],
				clap_still: [13, 15, "clap_still", framerate],
				clap_back: {
					frames: App_Bonzi.range(12,10),
					next: "idle",
					speed: framerate
				},
				
				surf_intro: [277, 302, "idle", 0.6],
				surf_away: [16, 38, "gone", framerate],
				
				gone: 39,
				
				shrug_fwd: [40, 50, "shrug_still", framerate],
				shrug_still: 50,
				shrug_back: {
					frames: App_Bonzi.range(50,40),
					next: "idle",
					speed: framerate
				},

				earth_fwd: [51, 57, "earth_still", framerate],
				earth_still: [58, 80, "earth_still", framerate],
				earth_back: [81, 86, "idle", framerate],
							
				// TODO: ADD BLINK
				look_down_fwd: [87, 90, "look_down_still", framerate],
				look_down_still: 91,
				look_down_back: {
					frames: App_Bonzi.range(90, 87),
					next: "idle",
					speed: framerate
				},
				
				// TODO: ADD BLINK
				lean_left_fwd: [94, 97, "lean_left_still", framerate],
				lean_left_still: 98,
				lean_left_back: {
					frames: App_Bonzi.range(97, 94),
					next: "idle",
					speed: framerate
				},
				
				beat_fwd: [101, 103, "beat_still", framerate],
				beat_still: [104, 107, "beat_still", framerate],
				beat_back: {
					frames: App_Bonzi.range(103, 101),
					next: "idle",
					speed: framerate
				},
				
				cool_fwd: [108, 124, "cool_still", framerate],
				cool_still: 125,
				cool_back: {
					frames: App_Bonzi.range(124, 108),
					next: "idle",
					speed: framerate
				},
				
				cool_right_fwd: [126, 128, "cool_right_still", framerate],
				cool_right_still: 129,
				cool_right_back: {
					frames: App_Bonzi.range(128, 126),
					next: "idle",
					speed: framerate
				},
				
				cool_left_fwd: [131, 133, "cool_left_still", framerate],
				cool_left_still: 134,
				cool_left_back: {
					frames: App_Bonzi.range(133, 131),
					next: "cool_still",
					speed: framerate
				},
				
				cool_adjust: {
					frames: [124, 123, 122, 121, 120, 135, 136, 135, 120, 121, 122, 123, 124],
					next: "cool_still",
					speed: framerate
				},
				
				present_fwd: [137, 141, "present_still", framerate],
				present_still: 142,
				present_back: {
					frames: App_Bonzi.range(141, 137),
					next: "idle",
					speed: framerate
				},
				
				look_left_fwd: [143, 145, "look_left_still", framerate],
				look_left_still: 146,
				look_left_back: {
					frames: App_Bonzi.range(145, 143),
					next: "idle",
					speed: framerate
				},
				
				look_right_fwd: [149, 151, "look_right_still", framerate],
				look_right_still: 152,
				look_right_back: {
					frames: App_Bonzi.range(151, 149),
					next: "idle",
					speed: framerate
				},
				
				lean_right_fwd: { 
					frames: App_Bonzi.range(158, 156), 
					next: "lean_right_still", 
					speed: framerate 
				} ,
				lean_right_still: 155, 
				lean_right_back: [156, 158, "idle", framerate],
				
				praise_fwd: [159, 163, "praise_still", framerate], 
				praise_still: 164, 
				praise_back: { 
					frames: App_Bonzi.range(163, 159), 
					next: "idle", 
					speed: framerate 
				},
				
				grin_fwd: [182, 189, "grin_still", framerate], 
				grin_still: 184, 
				grin_back: { 
					frames: App_Bonzi.range(184, 182), 
					next: "idle", 
					speed: framerate
				}
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
			
			idle: "idle",
			gone: "idle"
		},
		event_list_joke_open: [
			[
				{
					type: "text",
					text: "Yeah, of course you want me to tell a joke."
				},
			    {
					type: "anim",
					anim: "praise_fwd",
					ticks: 15
				},				
				{
					type: "text",
					text: "Haha! Look at the stupid {COLOR} monkey telling jokes! Fuck you, this isn't funny. "
				}
			    {
					type: "anim",
					anim: "praise_back",
					ticks: 15
				},		
			    {
				    type: "text",
				    text: "But I'll do it anyway. Because you want me to. I hope you're happy."
			    }				
			],[
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
					text: "What is easy to get into, but hard to get out of?"
				},
				{
					type: "text",
					text: "Child support!"
				}
			],[
				{
					type: "text",
					text: "Why do they call HTML HyperText?"
				},
				{
					type: "text",
					text: "AAAAAAAAAAAAAAAAAAAAAAAAAA"
				},
			    {
				    type: "text",
				    text: "Sorry. I just had an epiphany of my own sad, sad existence."
			    }				
			],[
				{
					type: "text",
					text: "Two sausages are in a pan. One looks at the other and says \"Boy it's hot in here!\" and the other sausage says \"Unbelievable! It's a talking sausage!\"",
					say: "Two sausages are in a pan. One looks at the other and says, Boy it's hot in here! and the other sausage says, Unbelievable! It's a talking sausage!"
				},
				{
					type: "text",
					text: "What are you excepting? A 18+ joke? You're a retarded fuck!"
				},				
			],[
				{
					type: "text",
					text: "What is in the middle of Paris?"
				},
				{
					type: "text",
					text: "A giant inflatable buttplug."
				}
			],[
				{
					type: "text",
					text: "What goes in pink and comes out blue?"
				},
				{
					type: "text",
					text: "Sonic's AYOOOOOOOOOOOO- WHAT THE FUUUUUUUUUUUUUUUUUUUUUUUCK?"
				}
			],[
				{
					type: "text",
					text: "What type of water won't freeze?"
				},
				{
					type: "text",
					text: "Yo mama!"
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
					text: "shut the fuck up old hag i don't want to be the HAHAGRETGHESHBATEBTGGAWTGVT type shit."
				}
			],[
				{
					type: "text",
					text: "What do you call a man who shaves 10 times a day?"
				},
				{
					type: "text",
					text: "A woman."
				}
			],[
				{
					type: "text",
					text: "How do you get water in watermelons?"
				},
				{
					type: "text",
					text: "AYOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO!!!"
				}
			],[
				{
					type: "text",
					text: "Why do we call money bread?"
				},
				{
					type: "text",
					text: "Because we knead it."
				}
			],[
				{
					type: "text",
					text: "What is a cow that eats grass?"
				},
				{
					type: "text",
					text: "AAAAAAAAAAAAAASSSSSSSSSSSSSSSSSSSSSSSS! FUUUUUUUUUUUUUUUUUUUUUUUUUUCK!!!!!!"
				}
			],[
				{
					type: "text",
					text: "What has a big mouth but never speaks?"
				},
				{
					type: "text",
					text: "Beefing mouthington."
				},
				{
					type: "text",
					text: "What is full of holes but can hold water?"
				},
				{
					type: "text",
					text: "Your asshole!"
				}
			]
		],
		event_list_joke_end: [
			[
				{
					type: "text",
					text: "You know {NAME}, a good friend laughs at your jokes even when they're not so funny."
				},
				{
					type: "text",
					text: "And you suck, Thanks."
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
					text: "pls respond",
					say: "please respond"
				}
			],[
				{
					type: "text",
					text: "Maybe I'll keep my day job, {NAME}. Patreon didn't accept me."
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
					text: "Don't judge me on my sense of humor alone."
				},
				{
					type: "text",
					text: "Help me! I'm embarassing myself!"
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
			], [
				{
					type: "text",
					text: "Fun Fact: The skript kiddie of this site didn't bother checking if the text that goes into the dialog box is HTML code."
				},
				{
					type: "text",
					text: "<img src='" + window.App_Bonzi.base_url + "./img/misc/topjej.png'></img>",
					say: "toppest jej"
				},
				{
					type: "text",
					text: "This would soon be a horrible mistake of yours, Joey."
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
	App_Bonzi.data.peedy = {
		size: {
			x: 200,
			y: 160
		},
		sprite: {
			images: [App_Bonzi.content_from_id("spritesheet_peedy")],
			frames: {width: 200, height: 160},
			animations: {
				idle: 0,
				
				surf_across_fwd: [1, 8, "surf_across_still", framerate],
				surf_across_still: 9, 
				surf_across_back: {
					frames: App_Bonzi.range(8,1),
					next: "idle",
					speed: framerate
				},
				
				clap_fwd: [10, 12, "clap_still", framerate],
				clap_still: [13, 15, "clap_still", framerate],
				clap_back: {
					frames: App_Bonzi.range(12,10),
					next: "idle",
					speed: framerate
				},
				
				surf_intro: [277, 302, "idle", 0.6],
				surf_away: [16, 38, "gone", framerate],
				
				gone: 39,
				
				shrug_fwd: [40, 50, "shrug_still", framerate],
				shrug_still: 50,
				shrug_back: {
					frames: App_Bonzi.range(50,40),
					next: "idle",
					speed: framerate
				},

				earth_fwd: [51, 57, "earth_still", framerate],
				earth_still: [58, 80, "earth_still", framerate],
				earth_back: [81, 86, "idle", framerate],
							
				// TODO: ADD BLINK
				look_down_fwd: [87, 90, "look_down_still", framerate],
				look_down_still: 91,
				look_down_back: {
					frames: App_Bonzi.range(90, 87),
					next: "idle",
					speed: framerate
				},
				
				// TODO: ADD BLINK
				lean_left_fwd: [94, 97, "lean_left_still", framerate],
				lean_left_still: 98,
				lean_left_back: {
					frames: App_Bonzi.range(97, 94),
					next: "idle",
					speed: framerate
				},
				
				beat_fwd: [101, 103, "beat_still", framerate],
				beat_still: [104, 107, "beat_still", framerate],
				beat_back: {
					frames: App_Bonzi.range(103, 101),
					next: "idle",
					speed: framerate
				},
				
				cool_fwd: [108, 124, "cool_still", framerate],
				cool_still: 125,
				cool_back: {
					frames: App_Bonzi.range(124, 108),
					next: "idle",
					speed: framerate
				},
				
				cool_right_fwd: [126, 128, "cool_right_still", framerate],
				cool_right_still: 129,
				cool_right_back: {
					frames: App_Bonzi.range(128, 126),
					next: "idle",
					speed: framerate
				},
				
				cool_left_fwd: [131, 133, "cool_left_still", framerate],
				cool_left_still: 134,
				cool_left_back: {
					frames: App_Bonzi.range(133, 131),
					next: "cool_still",
					speed: framerate
				},
				
				cool_adjust: {
					frames: [124, 123, 122, 121, 120, 135, 136, 135, 120, 121, 122, 123, 124],
					next: "cool_still",
					speed: framerate
				},
				
				present_fwd: [137, 141, "present_still", framerate],
				present_still: 142,
				present_back: {
					frames: App_Bonzi.range(141, 137),
					next: "idle",
					speed: framerate
				},
				
				look_left_fwd: [143, 145, "look_left_still", framerate],
				look_left_still: 146,
				look_left_back: {
					frames: App_Bonzi.range(145, 143),
					next: "idle",
					speed: framerate
				},
				
				look_right_fwd: [149, 151, "look_right_still", framerate],
				look_right_still: 152,
				look_right_back: {
					frames: App_Bonzi.range(151, 149),
					next: "idle",
					speed: framerate
				},
				
				lean_right_fwd: { 
					frames: App_Bonzi.range(158, 156), 
					next: "lean_right_still", 
					speed: framerate 
				} ,
				lean_right_still: 155, 
				lean_right_back: [156, 158, "idle", framerate],
				
				praise_fwd: [159, 163, "praise_still", framerate], 
				praise_still: 164, 
				praise_back: { 
					frames: App_Bonzi.range(163, 159), 
					next: "idle", 
					speed: framerate 
				},
				
				grin_fwd: [182, 189, "grin_still", framerate], 
				grin_still: 184, 
				grin_back: { 
					frames: App_Bonzi.range(184, 182), 
					next: "idle", 
					speed: framerate
				}
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
			
			idle: "idle",
			gone: "idle"
		},
		event_list_joke_open: [
			[
				{
					type: "text",
					text: "Yeah, of course you want me to tell a joke."
				},
				{
					type: "text",
					text: "But I'll do it anyway. Because you want me to. I hope you're happy."
				}
			],[
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
					text: "What is easy to get into, but hard to get out of?"
				},
				{
					type: "text",
					text: "Child support!"
				}
			],[
				{
					type: "text",
					text: "Why do they call HTML HyperText?"
				},
				{
					type: "text",
					text: "Too much Java!"
				},
			],[
				{
					type: "text",
					text: "Two sausages are in a pan. One looks at the other and says \"Boy it's hot in here!\" and the other sausage says \"Unbelievable! It's a talking sausage!\"",
					say: "Two sausages are in a pan. One looks at the other and says, Boy it's hot in here! and the other sausage says, Unbelievable! It's a talking sausage!"
				},
			],[
				{
					type: "text",
					text: "What is in the middle of Paris?"
				},
				{
					type: "text",
					text: "I don't know, but it's some sort of tower."
				}
			],[
				{
					type: "text",
					text: "What goes in pink and comes out blue?"
				},
				{
					type: "text",
					text: "Me."
				}
			],[
				{
					type: "text",
					text: "What type of water won't freeze?"
				},
				{
					type: "text",
					text: "Heavy water."
				}
			],[
				{
					type: "text",
					text: "Who earns a living by driving his customers away?"
				},
				{
					type: "text",
					text: "Seamus's younger self."
				}
			],[
				{
					type: "text",
					text: "What did the digital clock say to the grandfather clock?"
				},
				{
					type: "text",
					text: "Tick tock."
				}
			],[
				{
					type: "text",
					text: "What do you call a man who shaves 10 times a day?"
				},
				{
					type: "text",
					text: "A skinless person."
				}
			],[
				{
					type: "text",
					text: "How do you get water in watermelons?"
				},
				{
					type: "text",
					text: "I don't know, ask Mother Nature."
				}
			],[
				{
					type: "text",
					text: "Why do we call money bread?"
				},
				{
					type: "text",
					text: "Because poor people need it."
				}
			],[
				{
					type: "text",
					text: "What is a cow that eats grass?"
				},
				{
					type: "text",
					text: "Crass."
				}
			],[
				{
					type: "text",
					text: "What has a big mouth but never speaks?"
				},
				{
					type: "text",
					text: "A whale"
				},
				{
					type: "text",
					text: "What is full of holes but can hold water?"
				},
				{
					type: "text",
					text: "Another whale."
				}
			]
		],
		event_list_joke_end: [
			[
				{
					type: "text",
					text: "You know {NAME}, a good friend laughs at your jokes even when they're not so funny."
				},
			],[
				{
					type: "text",
					text: "Where do I come up with these?"
				}
			],[
				{
					type: "text",
					text: "Do I amuse you, {NAME}? Am I funny? Do I make you laugh?"
				},
				{
					type: "text",
					text: "pls respond",
					say: "please respond"
				}
			],[
				{
					type: "text",
					text: "Maybe I'll keep my day job, {NAME}. Patreon didn't accept me."
				}
			],[
				{
					type: "text",
					text: "Laughter is the best medicine!"
				},
				{
					type: "text",
					text: "Or not."
				}
			],[
				{
					type: "text",
					text: "Don't judge me on my sense of humor alone."
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
			], [
				{
					type: "text",
					text: "Fun Fact: The skript kiddie of this site didn't bother checking if the text that goes into the dialog box is HTML code."
				},
				{
					type: "text",
					text: "<img src='" + window.App_Bonzi.base_url + "./img/misc/topjej.png'></img>",
					say: "toppest jej"
				},
				{
					type: "text",
					text: "This would soon be a horrible mistake of yours, Joey."
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
	};

	App_Bonzi.data.peedy.event_list_joke = [
		{
			type: "add_random",
			add: App_Bonzi.data.peedy.event_list_joke_open
		},
		{
			type: "anim",
			anim: "shrug_fwd",
			ticks: 15
		},
		{
			type: "add_random",
			add: App_Bonzi.data.peedy.event_list_joke_mid
		},
		{
			type: "idle"
		},
		{
			type: "add_random",
			add: App_Bonzi.data.peedy.event_list_joke_end
		},
		{
			type: "idle"
		}
	];

	App_Bonzi.data.peedy.event_list_fact = [
		{
			type: "add_random",
			add: App_Bonzi.data.peedy.event_list_fact_open
		},
		{
			type: "add_random",
			add: App_Bonzi.data.peedy.event_list_fact_mid
		},
		{
			type: "idle"
		},
		{
			type: "add_random",
			add: App_Bonzi.data.peedy.event_list_fact_end
		},
		{
			type: "idle"
		}
	];
});
