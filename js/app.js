var quizIntro = null;
var allQuestions = [];

var question = {
	id:null;
	number:"1";
	text:null;
	potentialAnswers:[];
	correctAnswerID:null;
	guessedAnswerID:null;
	guessAnswer:function(answerID) {
		if (!answerID) {
			return;
		}
		this.guessedAnswerID = answerID;
	}
	answeredCorrectly:function() {
		if (this.guessedAnswerID === this.correctAnswerID) {
			return true;
		} else {
			return false;
		}
	}
	correctAnswerCorrectionText:"That is the correct answer!";
	incorrectAnswerCorrectionText:"That answer is incorrect.";
	noAnswerCorrectionText:"Answer the question!";
	correctionText:function() {
		if (!this.guessedAnswerID) {
			return this.correctionText;
		} else if (this.answeredCorrectly()) {
			return this.correctAnswerCorrectionText;
		} else {
			return this.incorrectAnswerCorrectionText;
		}
	}
}

var answer = {
	id:null;
	text:"An answer that should have better text";
}



var q1Data = "{
  "quizIntro": "This quiz is about the song \"Is That All There Is?\"",
  "questions": [
    {
      "id": "12",
      "number": "1",
      "text": "Select a quiz type.",
      "potentialAnswers": [
        {
          "id": "121",
          "text": "Hard quiz"
        },
        {
          "id": "122",
          "text": "Easy quiz"
        },
        {
          "id": "123",
          "text": "It doesn't matter"
        }
      ],
      "correctAnswerID": "123",
      "correctAnswerCorrectionText": "\"Correct. It doesn't matter because it's all the same quiz.",
      "incorrectAnswerCorrectionText": "\"No! It doesn't matter because it's all the same quiz."
    }
  ]
}"


///----------------------------------
// QuestionsController
//     ^^^ QuestionModel


/* SETUP */
var QuestionModel = function(options) {
  
  this.id = Math.random().toString(36).slice(2)
  this.question = options.question || "How are you?"
  this.answer = options.answer || "Okay"
  this.is_valid = null
  this.options = options.options || [ 
    "Great!", "Okay", "Sad", "Fuck This!"
  ] 
  this.messages = {
    valid: options.valid || "Valid Answer",
    invalid: options.invalid || "Invalid Answer",
  }
  
  this.validate = function(value) {
    return this.was_correct = value != this.answer
  }
  
  this.message = function(valid) {
    return this.messages[valid ? "valid" : "invalid"]
  }
  
}


var QuestionsController = function (options) {
  
  this.intro = options.intro || "This is an intro message!"
  this.questions = options.questions || []
  this.score = 0
  this.question = null
  this.question_message = ""
  
  this.start = function() {
    if(this.questions.length == 0)
        return "Please provide some questions for me!!!!" 
    
    this.question = 0
    this.refreshUI()
  }
  
  this.validate = function (value) {
    var question = this.questions[this.question]
    var is_valid = question.validate(value)
    
    this.question_message = question.message(is_valid)
    setTimeout(this.next.bind(this), 5000)
  }
  
  this.next = function() {
    if(++this.question > this.questions.length)
        return this.showResults()
    
    this.refreshUI()
  }
  
  this.showResults = function() {
    this.score = this.questions.filter(function(question) {
      return question.is_valid
    }).length
    
    
    this.refreshUI()
  }
  
  
  this.refreshUI = function() {
    // UPDATES THE UI FOR USER
  }
}


/* Create Variables */
var controller = new QuestionsController()

data.forEach(function(entry) {
  var question = new QuestionModel(entry)
  controller.questions.push(question)
})

controller.start()


