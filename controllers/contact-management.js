const Contact = require('../models/Contact');
const moment = require('moment')
const parser = require('json2csv')
const fs = require('fs')
const csv = require('csv-parser');

const maxDate = new Date(8640000000000000);
const minDate = new Date(-8640000000000000);

/**
 * GET /contact-management
 * Contact list page.
 */
exports.getContactList = async (req, res, next) => {
    try {
        const contactList = await Contact.find({}).lean().populate('directManager')
        res.render('contact/contact-list', {
            title: 'Contact Management',
            contactList: contactList,
            tempUserId: req.user._id
        })
    } catch (error) {
        return next(error)
    }
}

/**
 * POST /contact-management
 * Contact list page with filter. 
 */
exports.postContactList = async (req, res, next) => {
    const dobFromDateString = req.body.dobFromDate
    const dobToDateString = req.body.dobToDate
    var dobFromDateObj = minDate;
    var dobToDateObj = maxDate;
    if (moment(dobFromDateString, "MM/DD/YYYY").isValid()) {
        dobFromDateObj = new Date(Date.parse(dobFromDateString))
    }
    if (moment(dobToDateString, "MM/DD/YYYY").isValid()) {
        dobToDateObj = new Date(Date.parse(dobToDateString))
    }

    try {
        const contactList = await Contact.aggregate([
            {
                $project: {
                    userId: "$userId",
                    firstName: "$firstName",
                    middleName: "$middleName",
                    lastName: "$lastName",
                    directManager: "$directManager",
                    gender: "$gender",
                    startDate: "$startDate",
                    fullName: {
                        $concat: [
                            "$firstName", " ",
                            "$middleName", " ",
                            "$lastName"
                        ]
                    },
                    dOB: "$dOB",

                }
            },
            {
                $match: {
                    dOB: {
                        $gte: dobFromDateObj,
                        $lte: dobToDateObj
                    },
                    fullName: {
                        $regex: ".*" + req.body.fullName + ".*"
                    }
                }
            }
        ])

        await Contact.populate(contactList, { path: "directManager" })

        res.render('contact/contact-list', {
            title: 'Contact Management',
            contactList: contactList,
            tempUserId: req.user._id
        })

    } catch (error) {
        return next(error)
    }
}

/**
 * GET /contact-management/add
 * Contact add page.
 */
exports.getAddContact = async (req, res, next) => {
    try {
        const contactList = await Contact.find({})
        res.render('contact/contact-add', {
            title: 'Add Contact form',
            contactList: contactList
        })
    } catch (error) {
        return next(error)
    }
}


/**
 * POST /contact-management/add
 * Contact add page.
 */
exports.postAddContact = async (req, res, next) => {
    const contact = getContactFromReqBody(req)
    try {
        await contact.save()
        res.redirect('/contact-management')
    } catch (err) {
        for (field in err.errors) {
            req.flash('errors', { msg: err.errors[field].message });
        }
        return res.redirect('/contact-management/add');
    }
}

/**
 * GET /contact-management/edit
 * Contact edit page.
 */
exports.getEditContact = async (req, res, next) => {
    try {
        const contactList = await Contact.find({ _id: { $ne: req.params.id } })
        res.render('contact/contact-edit', {
            title: 'Edit Contact form',
            tempContact: req.contact,
            contactList: contactList
        })
    } catch (error) {
        return next(error)
    }
}

/**
 * POST /contact-management/edit
 * Contact edit page.
 */
exports.postEditContact = async (req, res, next) => {
    try {
        const newContact = getContactFromReqBody(req)

        req.contact.firstName = newContact.firstName
        req.contact.middleName = newContact.middleName
        req.contact.lastName = newContact.lastName
        req.contact.directManager = newContact.directManager
        req.contact.dOB = newContact.dOB
        req.contact.gender = newContact.gender
        req.contact.startDate = newContact.startDate
        await req.contact.save()

        res.redirect('/contact-management')
    } catch (err) {
        for (field in err.errors) {
            req.flash('errors', { msg: err.errors[field].message });
        }
        return res.redirect('/contact-management/edit/' + req.params.id);
    }
}


/**
 * DELETE /contact-management/delete
 * Contact delete page.
 */
exports.deleteContact = async (req, res, next) => {
    try {
        await req.contact.remove()
        return res.status(200).send()
    } catch (error) {
        return next(error)
    }
}

/**
 * DELETE /contact-management/delete-multiple
 * Contact delete page.
 */
exports.deleteMultipleContact = async (req, res, next) => {
    try {
        const idList = req.body.idList
        for (let i = 0; i < idList.length; i++) {
            const id = idList[i];

            const contact = await Contact.findOne({ _id: id })

            if (!contact) {
                return res.render('error/404')
            }

            if (contact.userId.toString() !== req.user._id.toString()) {
                return res.render('error/403')
            }
        }

        await Contact.deleteMany({
            _id: {
                $in: req.body.idList
            }
        })
        return res.status(200).send()
    } catch (error) {
        return next(error)
    }
}

/**
 * GET /contact-management/export-csv
 * Download contact list as csv file page.
 */
exports.exportContacts = async (req, res, next) => {
    try {
        const contacts = await Contact.find()
        const fields = [
            {
                label: '_id',
                value: '_id'
            },
            {
                label: 'firstName',
                value: 'firstName'
            },
            {
                label: 'middleName',
                value: 'middleName'
            },
            {
                label: 'lastName',
                value: 'lastName'
            },
            {
                label: 'directManager',
                value: 'directManager'
            },
            {
                label: 'dOB',
                value: (row, field) => moment(row.dOB).format("MM/DD/YYYY")
            },
            {
                label: 'gender',
                value: 'gender'
            },
            {
                label: 'startDate',
                value: (row, field) => moment(row.startDate).format("MM/DD/YYYY")
            }
        ]
        const json2csv = new parser.Parser({ fields })
        const convertedCSVFile = json2csv.parse(contacts)

        res.header('Content-Type', 'text/csv')
        res.attachment('contacts.csv')
        res.send(convertedCSVFile)
    } catch (error) {
        next(error)
    }
}

/**
 * POST /contact-management/import-csv
 * Upload contact list from csv file page.
 */
exports.importContacts = async (req, res, next) => {
    try {
        await fs.createReadStream(req.file.path)
            .on('error', (err) => {
                console.log(err);
            })
            .pipe(csv())
            .on('data', async (row) => {
                const doesExists = await Contact.exists({ _id: row._id })
                if (!doesExists) {
                    const contact = new Contact({
                        _id: row._id,
                        userId: req.user._id,
                        firstName: row.firstName,
                        middleName: row.middleName,
                        lastName: row.lastName,
                        directManager: row.directManager,
                        dOB: row.dOB,
                        gender: row.gender,
                        startDate: row.startDate
                    })
                    await contact.save()
                }
            })
            .on('end', () => {
                fs.unlinkSync(req.file.path);
            })
        res.redirect('/contact-management')
    } catch (error) {
        next(error)
    }
}

function getContactFromReqBody(req) {
    const timestampDoB = Date.parse(req.body.doB)
    const timestampStartDate = Date.parse(req.body.startDate)

    const userId = req.user._id
    const firstName = req.body.firstName
    const middleName = req.body.middleName
    const lastName = req.body.lastName
    const directManager = req.body.directManager
    let dOB = new Date(timestampDoB)
    const gender = req.body.gender
    let startDate = new Date(timestampStartDate)

    const contact = new Contact({
        userId,
        firstName,
        middleName,
        lastName,
        directManager,
        dOB,
        gender,
        startDate
    })

    return contact
}