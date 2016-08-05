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