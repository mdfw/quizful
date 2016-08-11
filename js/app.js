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
		no_answer: markdown_to_html(options.messages.no_answer) || "Answer me!"
	}
  
	this.validate = function(value) {
		this.guessed_id = value;
		return this.is_correct;
	}
  
	this.is_correct = function() {
		return this.answer_ids.indexOf(this.guessed_id) != -1;
	}
  
	this.message = function() {
		if (!this.completed) {
			return messages[no_answer];
		} else {
			return this.messages[this.valid ? "valid" : "invalid"];
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
		if (this.current_q.completed) {
			this.q_index++;
		}
	}
	
	this.quiz_complete = function() {
		return this.q_index > this.questions.length;
	}
	
	this.total_score = function() {
		return this.questions.filter(function(question) {
      		return question.is_correct;
    	}).length;
	}
	
	this.total_questions = function() {
		return this.questions.length;
	}
}

var QuizController = function(options) {
	console.log("Creating quizcontroller");
	this.qmod = new QuizModerator(options);
	
	this.run = function() {
		this.refreshUI();
	}	
	
	this.refreshUI = function() {
		console.log("!Refreshing UI");
		var q = this.qmod.current_q();
		console.dir(this.qmod);
		console.dir(q);
		this.refresh_question_text();
		this.refresh_answers();
		this.refresh_button_state();
		this.refresh_correction_area();
	}
	
	this.refresh_question_text = function() {
		var q = this.qmod.current_q();
		var qnum = q.question_visual_id;
		if (qnum) {
			$(".question-number").text(qnum);
		} else {
			$(".question-number").hide;
		}
		var qtext = q.question_text;
		$(".question-text").text(q.question_text);
	}
	
	this.watch_answers_for_change = function() {
		console.log("starting watch_answers_for_change.");
		$("[type='radio']").off('change');
		$("[type='radio']").on('change', function() {
			console.log("Changed!");
			/*this.set_button_state.call();*/ // This is not working because of some binding problem I cannot solve.
			answer_set_changed();
		})
	}
	
	this.refresh_answers = function() {
		console.log("Refreshing answers");
		var q = this.qmod.current_q();
		jQuery.each(q.answers, function(key, value) {
			var ans = q.answers[key];
			var new_answer = $(".answer-prototype").clone();
			new_answer.find("label").attr('for', ans.numerator);
			new_answer.find("span").html(ans.numerator + ". " + ans.text);
			var radio = new_answer.find("input");
			radio.attr('id', ans.numerator);
			radio.val(ans.id);
			radio.attr('accesskey', ans.accesskey);
			if (q.completed) {
				radio.disabled
			}
			if (ans.id === q.guessed_id) {
				radio.prop('checked', true)
			}
			new_answer.removeClass("answer-prototype");
			$("#answer-list").append(new_answer);
		})
		this.watch_answers_for_change();
		console.log("Finished refreshing answers.");
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
		this.answer_selected();
		if (q.completed()) {
			if (!the_button.hasClass("forward-button")) {
				the_button.removeClass("check-button").addClass("forward-button");
				the_button.text("Continue");
			}
			if (the_button.prop('disabled')) {
				the_button.prop('disabled', false);
				the_button.attr('title', "Continue to the next question or to see your results.");
				the_button.off("submit");
				 the_button.submit(function( event ) {
				 	event.preventDefault();
  					next_question();
				})
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
				the_button.off("submit");
				$("#formbutton").submit(function( event ) {
					console.log("Submitting, should be checking...");
					event.preventDefault();
  					check_answer(event);
				})

			} else if (!this.answer_selected() && !the_button.prop('disabled')) {
				the_button.prop('disabled', true);
				the_button.attr('title', "Select an answer to check your work.");
			}
		}
	}
	

	this.refresh_correction_area = function() {
		var q = this.qmod.current_q();
		$("#correction-text").html(q.message());
	}
	
	this.verify_answer = function() {
		var ans_value = $("[type='radio']:checked").first().val();
		this.qmod.check_answer(ans_value);
		this.refreshUI();
	}
}

var q1Data = '{ "introduction": "This quiz is about the song _Is That All There Is?_", "final_text": "Read more on Wikipedia\x27s entry on [Is that all there is?](https://en.wikipedia.org/wiki/Is_That_All_There_Is%3F)", "questions": [ { "id": "12", "question_visual_id": "1", "question_text": "Select a quiz type.", "answer_ids": [ "123" ], "answers": [ { "id": "121", "numerator": "a", "accesskey": "a", "text": "Hard quiz" }, { "id": "122", "numerator": "b", "accesskey": "b", "text": "Easy quiz" }, { "id": "123", "numerator": "c", "accesskey": "c", "text": "It does not matter" } ], "messages": { "correct": "Correct. It does not matter because it is all the same quiz.", "incorrect": "No! It does not matter because it is all the same quiz." } }, { "id": "13", "question_visual_id": "2", "question_text": "The song _Is That All There Is_ was originally released in…", "answer_ids": [ "131" ], "answers": [ { "id": "131", "numerator": "a", "accesskey": "a", "text": "1967" }, { "id": "132", "numerator": "b", "accesskey": "b", "text": "1970" }, { "id": "133", "numerator": "c", "accesskey": "c", "text": "1901" }, { "id": "134", "numerator": "d", "accesskey": "d", "text": "Multiple times", "correction": "Wait, how could you pick that!? Did you read the question? *Originally* means only once silly." } ], "messages": { "correct": "Correct. While made famous by Peggy Lee in 1969, it was originally performed by Georgia Brown in May 1967 for a television special.", "incorrect": "Incorrect. While made famous by Peggy Lee in 1969, it was originally performed by Georgia Brown in May 1967 for a television special." } }, { "id": "14", "question_visual_id": "3", "question_text": "The song was made popular by Peggy Lee in 1969. What song was a hit for her before this one?", "answer_ids": [ "143" ], "answers": [ { "id": "141", "numerator": "a", "accesskey": "a", "text": "_The Devil Went Down to Georgia_" }, { "id": "142", "numerator": "b", "accesskey": "b", "text": "_Georgia On My Mind_", "correction": "No, that was [Georgia Brown](https://en.wikipedia.org/wiki/Georgia_Brown_(English_singer))" }, { "id": "143", "numerator": "c", "accesskey": "c", "text": "_Fever_" }, { "id": "144", "numerator": "d", "accesskey": "d", "text": "_A Mild Winter Cough_" } ], "messages": { "correct": "Correct. _Fever_ was her previous hit.", "incorrect": "Incorrect. _Fever_ was her previous hit." } }, { "id": "15", "question_visual_id": "4", "question_text": "Multiple people have covered the song. Which of these artists did *not* sing it?", "answer_ids": [ "153" ], "answers": [ { "id": "151", "numerator": "a", "accesskey": "a", "text": "Chaka Khan", "correction": "She covered it: [Chaka Khan](https://en.wikipedia.org/wiki/Chaka_Khan)" }, { "id": "152", "numerator": "b", "accesskey": "b", "text": "P.J. Harvey", "correction": "She covered it: [P.J. Harvey](https://en.wikipedia.org/wiki/P.J._Harvey)" }, { "id": "153", "numerator": "c", "accesskey": "c", "text": "Prince", "correction": "No, but he did record _Let\x27s go crazy_ which is arguably better." }, { "id": "154", "numerator": "d", "accesskey": "d", "text": "Homer Simpson", "correction": "In the _Children of a Lesser Clod_ episode of the Simpsons, Homer sings a verse of the chorus when asked by Rod Flanders to &quot;...sing that crazy song we love&quot;." }, { "id": "155", "numerator": "e", "accesskey": "e", "text": "Hildegard Knef", "correction": "Released a German version called _Wenn das alles ist_. [Hildegard Knef](https://en.wikipedia.org/wiki/Hildegard_Knef)" } ], "messages": { "correct": "Correct. Prince never covered it (although there\x27s a whole vault of content that\x27s never been released...)", "incorrect": "Incorrect. Prince was the one who never covered it." } }, { "id": "16", "question_visual_id": "5", "question_text": "Could you sing _Fever_ better than Rufferella?", "answer_ids": [ "162" ], "answers": [ { "id": "161", "numerator": "y", "accesskey": "y", "text": "Yes" }, { "id": "162", "numerator": "n", "accesskey": "n", "text": "No" } ], "messages": { "correct": "Correct. Correct, she sang for the queen, did you? [Rufferella](https://amzn.com/0747550387?)", "incorrect": "Incorrect, she sang for the queen. Did you? No, I didn\x27t think so. [Rufferella](https://amzn.com/0747550387?)" } }, { "id": "17", "question_visual_id": "6", "question_text": "The lyrics talk of being disappointed with various experiences in her life. What experience did *not* happen to the protaganist?", "answer_ids": [ "174" ], "answers": [ { "id": "171", "numerator": "a", "accesskey": "a", "text": "Her family\x27s house caught on fire" }, { "id": "172", "numerator": "b", "accesskey": "b", "text": "She saw the circus" }, { "id": "173", "numerator": "c", "accesskey": "c", "text": "Falling in love" }, { "id": "174", "numerator": "d", "accesskey": "d", "text": "Her dog died" } ], "messages": { "correct": "Correct. Her dog was not mentioned.", "incorrect": "Incorrect. Nothing happened to her dog." } }, { "id": "18", "question_visual_id": "5", "question_text": "Is that all there is?", "answer_ids": [ "182", "183" ], "answers": [ { "id": "181", "numerator": "y", "accesskey": "y", "text": "Yes" }, { "id": "182", "numerator": "n", "accesskey": "n", "text": "No" } ], "messages": { "correct": "Trick question. Both answers are correct. So let\x27s &quot;break out the booze and have a ball — if that\x27s all there is.&quot;", "incorrect": "Trick question. Both answers are correct. So let\x27s &quot;break out the booze and have a ball — if that\x27s all there is.&quot;" } } ] }'


var quiz_controller;

$(document).ready(function() {
	$("#quiz1link").click(function(event) {
		event.preventDefault();
	  	loadQuestion1();
	})
	loadQuestion1();
});

function loadQuestion1() {
	quiz_controller = loadQuestion(q1Data);
	if (quiz_controller) {
		hide_introduction();
	}
	quiz_controller.run();
}

function hide_introduction() {
	var intro = $("#introduction");
	var quiz = $("#quiz");
	intro.attr('hidden');
	intro.addClass('hidden');
	quiz.removeAttr('hidden');
	quiz.removeClass('hidden');
}

function loadQuestion(qdata) {
	var jsonObject = JSON.parse(qdata);
	var qc = new QuizController(jsonObject);
	jsonObject = null;
	return qc;
}

/* These are a hack because I couldn't figure out how to get back to my controller */
function answer_set_changed() {
	quiz_controller.refresh_button_state();
}

function check_answer(event) {
	event.preventDefault();
	console.log("check answer");
	quiz_controller.verify_answer();
	console.log("end check answer");
	return false;
}

function next_question(event) {
	
}