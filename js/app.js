/* Markdown things */
showdown.extension('pclear', function() {
  return [{
    type: 'output',
    filter: function(txt, conv, opts) {
      var div = document.createElement('div');
      var finalTxt = '';
      div.innerHTML = txt;
      for (var i=0; i<div.children.length; ++i) {
      if (div.children[i].tagName.toLowerCase() === 'p') {
        finalTxt += div.children[i].innerHTML;
      }
      return finalTxt;
    }
  }}];
});

function markdown_to_html(markdown_text) {
	var converter;
	if (!converter) {
		converter = new showdown.Converter({extensions: ['pclear']});
	}
	return converter.makeHtml(markdown_text);
}

// End Markdown //

var QuestionModel = function(options) {
  	this.id = options.id || Math.random().toString(36).slice(2)
	this.question_visual_id = options.question_visual_id || "1";
	this.question_text = markdown_to_html(options.question_text) || "How are you?";
	this.answer_ids = options.answer_ids;
	this.guessed_id = null;
	this.multiple_correct = options.mutiple_correct || false;
	this.answers = parse_answers(options);
	
	function parse_answers(options) {
		var answers_json = options.answers;
		ans = [];
		options.answers.forEach(function(entry) {
			var answer = new AnswerModel(entry);
			ans.push(answer);
		});
		return ans;
	}
	this.messages = {
		correct: markdown_to_html(options.messages.correct) || "Correct Answer",
		incorrect: markdown_to_html(options.messages.incorrect) || "Incorrect Answer",
		no_answer: markdown_to_html(options.messages.no_answer) || ""
	}
  
	this.validate = function(value) {
		this.guessed_id = value;
		return this.is_correct();
	}
  
	this.is_correct = function() {
		return this.answer_ids.indexOf(this.guessed_id) != -1;
	}
  
	this.message = function() {
		if (!this.completed()) {
			return this.messages["no_answer"];
		} else {
			return this.messages[this.is_correct() ? "correct" : "incorrect"];
		}
	}
  
	this.completed = function() {
		var c = !(!this.guessed_id || 0 === this.guessed_id.length);
	 	return c;
	}
}

var AnswerModel = function(options) {
	this.id = options.id ||  Math.random().toString(36).slice(2);
	this.numerator = options.numerator || "a";
	this.accesskey = options.accesskey || null;
	this.text = markdown_to_html(options.text) || "An answer that should be more interesting";
	this.correction = markdown_to_html(options.correction) || null;
}


var QuizModerator = function(options) {
	this.introduction = markdown_to_html(options.introduction) || "Oops, we are missing an introduction";
	this.final_text = markdown_to_html(options.final_text) || "Here should be some feedback.";
	this.questions = parse_questions(options);
	function parse_questions(options) {
		var qs = [];
		options.questions.forEach(function(entry) {
			var question = new QuestionModel(entry);
			qs.push(question);
		});	
		return qs;

	}
	this.q_index = 0;
	
	this.current_q = function() {
		return this.questions[this.q_index];
	}
	
	this.check_answer = function(answer_id) {
		if (!answer_id) {
			return;
		}
		this.current_q().validate(answer_id);
	}
	
	this.next_question = function() {
		if (this.current_q().completed()) {
			this.q_index++;
		}
	}
	
	this.quiz_complete = function() {
		return this.q_index > this.questions.length-1;
	}
	
	this.total_score = function() {
		return this.questions.filter(function(question) {
      		return question.is_correct();
    	}).length;
	}
	
	this.total_questions = function() {
		return this.questions.length - 1;
	}
}

var QuizController = function(options) {
	this.qmod = new QuizModerator(options);
	
	this.run = function() {
		this.refreshUI();
	}	
	
	this.end = funtion() {
		$("#quiz").attr('hidden').addClass('hidden');
		show_introduction();
	}
	
	this.refreshUI = function() {
		if (this.qmod.quiz_complete()) {
			this.show_final_score();
			return;
		} 
		if ($("#quiz").hasClass('hidden')) {
			$("#quiz").removeAttr('hidden').removeClass('hidden');
		}
		this.refresh_question_text();
		this.refresh_answers();
		this.refresh_button_state();
		this.refresh_correction_area();
	}
	
	this.refresh_question_text = function() {
		var q = this.qmod.current_q();
		var qnum = q.question_visual_id;
		if (qnum) {
			$(".question-number").html(qnum);
		} else {
			$(".question-number").hide;
		}
		var qtext = q.question_text;
		$(".question-text").html(q.question_text);
	}
	
	this.watch_answers_for_change = function() {
		var quiz_controller = this;
		$("[type='radio']").off('change');
		$("[type='radio']").on('change', function() {
			quiz_controller.refresh_button_state();
		})
	}
	
	this.refresh_answers = function() {
		var q = this.qmod.current_q();
		$("#answer-list").find(".answer").remove();
		jQuery.each(q.answers, function(key, value) {
			var ans = q.answers[key];
			var new_answer = $(".answer-prototype").clone();
			new_answer.find("label").attr('for', ans.numerator);
			if (q.completed() && ans.id === q.guessed_id && ans.correction) {
				new_answer.find("span").html(ans.numerator + ". " + ans.text + "  <span class='ans_correction_text'>" + ans.correction + "</span>");
			} else {
				new_answer.find("span").html(ans.numerator + ". " + ans.text);
			}
			var radio = new_answer.find("input");
			radio.attr('id', ans.numerator);
			radio.val(ans.id);
			radio.attr('accesskey', ans.accesskey);
			if (q.completed()) {
				radio.prop('disabled', true)
			}
			if (ans.id === q.guessed_id) {
				radio.prop('checked', true)
			}
			new_answer.removeClass("answer-prototype");
			$("#answer-list").append(new_answer);
		})
		this.watch_answers_for_change();
	}
	
	this.answer_selected = function() {
		var answers = $("[type='radio']:checked");
		return answers.length > 0;
	}
	this.selected_answer_text = function() {
		return $("[type='radio']:checked").first().next().text();
	}
	
	this.refresh_button_state = function() {
		var q = this.qmod.current_q();
		var the_button = $("#formbutton");
		var quiz_controller = this;
		
		if (q.completed()) {
			if (!the_button.hasClass("forward-button")) {
				the_button.removeClass("check-button").addClass("forward-button");
				the_button.text("Continue");
				the_button.attr('title', "Continue to the next question or to see your results.");
				$("#quiz").off("submit");
				 $("#quiz").submit(function( event ) {
				 	event.preventDefault();
  					quiz_controller.continue_quiz();
				})
			}
			if (the_button.prop('disabled')) {
				the_button.prop('disabled', false);
			}
		} else {
			if (!the_button.hasClass("check-button")) {
				the_button.removeClass("forward-button").addClass("check-button");
				the_button.text("Am I right?");
			}

			if (this.answer_selected() && the_button.prop('disabled')) {
				the_button.prop('disabled', false);
				var button_title = "Check if your answer is correct.";
				var answer_text = this.selected_answer_text();
				if (answer_text) {
					button_title = "Check if your answer '" + answer_text + "' is correct.";
				}
				the_button.attr('title', button_title);
				$("#quiz").off("submit");
				$("#quiz").submit(function( event ) {
					event.preventDefault();
  					quiz_controller.verify_answer(event);
				})

			} else if (!this.answer_selected() && !the_button.prop('disabled')) {
				the_button.prop('disabled', true);
				the_button.attr('title', "Select an answer to check your work.");
			}
		}
	}
	

	this.refresh_correction_area = function() {
		var q = this.qmod.current_q();
		var msg = q.message();
		
		$("#correction-text").html(q.message());
	}
	
	this.verify_answer = function() {
		event.preventDefault();	
		var ans_value = $("[type='radio']:checked").first().val();
		this.qmod.check_answer(ans_value);
		this.refreshUI();
	return false;
	}
	
	this.continue_quiz = function() {
		if (this.qmod.current_q().completed()) {
			this.qmod.next_question();
			this.refreshUI();
		} 
	}
	
	this.show_final_score = function() {
		$("#quiz").attr('hidden')
		$("#quiz").addClass('hidden');
		$("#completed-quiz").removeAttr('hidden').removeClass('hidden');
		var score_percentage = 0;
		score_percentage = (this.qmod.total_score()/this.qmod.total_questions()) * 100;
		var fire_fireworks = false;
		var final_score_title = "Pretty good."
		if (score_percentage > 90) {
			final_score_title = "Amazing!";
			fire_fireworks = true;
		} else if (score_percentage > 70) {
			final_score_title = "Really good!";
			fire_fireworks = true;
		} else if (score_percentage > 50) {
			final_score_title = "Not bad. Do better next time to get fireworks!";
		} else {
			final_score_title = "Boy, that was terrible.  Do better next time to get the lovely fireworks!";
		}
		$("#completed-quiz-title").html(final_score_title);
		var completed_quiz_text = "You answered " + this.qmod.total_score() + " correctly out of " + this.qmod.total_questions() + ". " + this.qmod.final_text;
		$("#completed-quiz-text").html(completed_quiz_text);
		if (fire_fireworks) {
			this.show_fireworks();
		}
		
	}
	
	this.show_fireworks = function() {
		start_fireworks();
		$("body").addClass("fireworks-background-set");
		$("#completed-quiz-title").addClass("fireworks-text");
		$("#completed-quiz-text").addClass("fireworks-text");
		$("#completed-quiz").addClass('fireworks-stage');
		var _this = this;
		setTimeout(function() {
			_this.stop_fireworks();
		}, 5000);

	}
	
	this.stop_fireworks = function() {
		$("body").addClass("fireworks-background-remove");
		$("#completed-quiz-title").removeClass("fireworks-text");
		$("#completed-quiz-text").removeClass("fireworks-text");
		$("#completed-quiz").removeClass('fireworks-stage');
		end_fireworks();
		setTimeout(function() {
			$("body").removeClass("fireworks-background-set");
			$("body").removeClass("fireworks-background-remove");
		}, 1000);
	}
	

}

var q1Data = '{ "introduction": "This quiz is about the song _Is That All There Is?_", "final_text": "Read more on Wikipedia\x27s entry on [Is that all there is?](https://en.wikipedia.org/wiki/Is_That_All_There_Is%3F)", "questions": [ { "id": "12", "question_visual_id": "1", "question_text": "Select a quiz type.", "answer_ids": [ "123" ], "answers": [ { "id": "121", "numerator": "a", "accesskey": "a", "text": "Hard quiz" }, { "id": "122", "numerator": "b", "accesskey": "b", "text": "Easy quiz" }, { "id": "123", "numerator": "c", "accesskey": "c", "text": "It does not matter" } ], "messages": { "correct": "Correct. It does not matter because it is all the same quiz.", "incorrect": "No! It does not matter because it is all the same quiz." } }, { "id": "13", "question_visual_id": "2", "question_text": "The song _Is That All There Is_ was originally released in…", "answer_ids": [ "131" ], "answers": [ { "id": "131", "numerator": "a", "accesskey": "a", "text": "1967" }, { "id": "132", "numerator": "b", "accesskey": "b", "text": "1970" }, { "id": "133", "numerator": "c", "accesskey": "c", "text": "1901" }, { "id": "134", "numerator": "d", "accesskey": "d", "text": "Multiple times", "correction": "*Originally* means only once silly." } ], "messages": { "correct": "Correct. While made famous by Peggy Lee in 1969, it was originally performed by Georgia Brown in May 1967 for a television special.", "incorrect": "Incorrect. While made famous by Peggy Lee in 1969, it was originally performed by Georgia Brown in May 1967 for a television special." } }, { "id": "14", "question_visual_id": "3", "question_text": "The song was made popular by Peggy Lee in 1969. What song was a hit for her before this one?", "answer_ids": [ "143" ], "answers": [ { "id": "141", "numerator": "a", "accesskey": "a", "text": "_The Devil Went Down to Georgia_" }, { "id": "142", "numerator": "b", "accesskey": "b", "text": "_Georgia On My Mind_", "correction": "No, that was [Georgia Brown](https://en.wikipedia.org/wiki/Georgia_Brown_(English_singer))" }, { "id": "143", "numerator": "c", "accesskey": "c", "text": "_Fever_" }, { "id": "144", "numerator": "d", "accesskey": "d", "text": "_A Mild Winter Cough_" } ], "messages": { "correct": "Correct. _Fever_ was her previous hit.", "incorrect": "Incorrect. _Fever_ was her previous hit." } }, { "id": "15", "question_visual_id": "4", "question_text": "Multiple people have covered the song. Which of these artists did *not* sing it?", "answer_ids": [ "153" ], "answers": [ { "id": "151", "numerator": "a", "accesskey": "a", "text": "Chaka Khan", "correction": "She covered it: [Chaka Khan](https://en.wikipedia.org/wiki/Chaka_Khan)" }, { "id": "152", "numerator": "b", "accesskey": "b", "text": "P.J. Harvey", "correction": "She covered it: [P.J. Harvey](https://en.wikipedia.org/wiki/P.J._Harvey)" }, { "id": "153", "numerator": "c", "accesskey": "c", "text": "Prince", "correction": "Correct. However, he did record _Let\x27s go crazy_ which is arguably better." }, { "id": "154", "numerator": "d", "accesskey": "d", "text": "Homer Simpson", "correction": "In the _Children of a Lesser Clod_ episode of the Simpsons, Homer sings a verse of the chorus when asked by Rod Flanders to &quot;...sing that crazy song we love&quot;." }, { "id": "155", "numerator": "e", "accesskey": "e", "text": "Hildegard Knef", "correction": "Released a German version called _Wenn das alles ist_. [Hildegard Knef](https://en.wikipedia.org/wiki/Hildegard_Knef)" } ], "messages": { "correct": "Correct. Prince never covered it (although there\x27s a whole vault of content that\x27s never been released...)", "incorrect": "Incorrect. Prince was the one who never covered it." } }, { "id": "16", "question_visual_id": "5", "question_text": "Could you sing _Fever_ better than Rufferella?", "answer_ids": [ "162" ], "answers": [ { "id": "161", "numerator": "y", "accesskey": "y", "text": "Yes" }, { "id": "162", "numerator": "n", "accesskey": "n", "text": "No" } ], "messages": { "correct": "Correct. She sang for the queen, did you? [Rufferella](https://amzn.com/0747550387?)", "incorrect": "Incorrect, she sang for the queen. Did you? No, I didn\x27t think so. [Rufferella](https://amzn.com/0747550387?)" } }, { "id": "17", "question_visual_id": "6", "question_text": "The lyrics talk of being disappointed with various experiences in her life. What experience did *not* happen to the protaganist?", "answer_ids": [ "174" ], "answers": [ { "id": "171", "numerator": "a", "accesskey": "a", "text": "Her family\x27s house caught on fire" }, { "id": "172", "numerator": "b", "accesskey": "b", "text": "She saw the circus" }, { "id": "173", "numerator": "c", "accesskey": "c", "text": "Falling in love" }, { "id": "174", "numerator": "d", "accesskey": "d", "text": "Her dog died" } ], "messages": { "correct": "Correct. Her dog was not mentioned.", "incorrect": "Incorrect. Nothing happened to her dog." } }, { "id": "18", "question_visual_id": "5", "question_text": "Is that all there is?", "answer_ids": [ "182", "183" ], "answers": [ { "id": "181", "numerator": "y", "accesskey": "y", "text": "Yes" }, { "id": "182", "numerator": "n", "accesskey": "n", "text": "No" } ], "messages": { "correct": "Trick question. Both answers are correct. So let\x27s &quot;break out the booze and have a ball — if that\x27s all there is.&quot;", "incorrect": "Trick question. Both answers are correct. So let\x27s &quot;break out the booze and have a ball — if that\x27s all there is.&quot;" } } ] }'


var quiz_controller;

$(document).ready(function() {
	$("#quiz1link").click(function(event) {
		event.preventDefault();
	  	loadQuestion1(); 
	  	quiz_controller.run();
	})
});

function loadQuestion1() {
	quiz_controller = loadQuestion(q1Data);
	if (quiz_controller) {
		hide_introduction();
	}
}

function hide_introduction() {
	var intro = $("#introduction");
	intro.attr('hidden');
	intro.addClass('hidden');
}

function show_introduction() {
	var intro = $("#introduction");
	intro.removeAttr('hidden');
	intro.removeClass('hidden');
}
function loadQuestion(qdata) {
	var jsonObject = JSON.parse(qdata);
	var qc = new QuizController(jsonObject);
	jsonObject = null;
	return qc;
}


