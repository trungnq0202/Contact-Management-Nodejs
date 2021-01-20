const mongoose = require('mongoose')

const contactSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    firstName: {
        type: String,
        required: [true, 'First name cannot be blank']
    },

    middleName: {
        type: String,
        required: [true, 'Middle name cannot be blank']
    },

    lastName: {
        type: String,
        required: [true, 'Last name cannot be blank']
    },

    directManager:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contact",
        required: false
    },

    dOB: {
        type: Date,
        required: [true, 'Date of birth cannot be blank']
    },

    gender: {
        type: String,
        required: [true, 'Gender cannot be blank']
    },

    startDate: {
        type: Date,
        required: [true, 'Start date cannot be blank'],

        validate: {
            validator: function(value){
                var diff_ms = Date.now() - value.getTime();
                var age_dt = new Date(diff_ms); 
  
                return Math.abs(age_dt.getUTCFullYear() - 1970) >= 22
            },
            message: "Contact must be from 22 years old"
        }
    }
})

contactSchema.pre('validate', async function() {
    const contact = this
    if (!contact.directManager) {
        contact.directManager = null
    }
})

const Contact = mongoose.model('Contact', contactSchema)

module.exports = Contact