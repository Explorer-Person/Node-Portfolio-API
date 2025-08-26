// controllers/admin/heroController.js
const mongoose = require("mongoose");
const { HeroModel } = require("#models");

/** Utility: consistent API shape */
const ok = (res, data = null, message = "OK", status = 200, meta = undefined) =>
    res.status(status).json({ ok: true, message, data, ...(meta ? { meta } : {}) });

const fail = (res, message = "Bad Request", status = 400, details = undefined) =>
    res.status(status).json({ ok: false, message, ...(details ? { details } : {}) });


/**
 * POST /api/admin/hero/
 * Body: { fk: Number (required), title?: String, desc?: String, id?: Number }
 */
async function createHero(req, res) {
    try {
        const body = req.body || {};

        console.log(body, "Hero body")

        const items = await HeroModel.find()
            .sort({ createdAt: -1 }) // descending order
            .lean();

        console.log(items);



        // build payload exactly per schema
        let payload = {
            _id: body.id,
            fk: "0",
            title: body.title,
            desc: body.desc,
        };
        console.log(payload)

        if (items.length >= 1) {
            payload._id = items[0]._id; // use existing _id if available
            console.log("Updating existing hero", items[0]._id);
            const doc = await HeroModel.findByIdAndUpdate(items[0]._id, payload, {
                new: true,
                runValidators: true,
            });
            return ok(res, doc, "Hero updated.", 201);
        } else {
            const doc = await HeroModel.create(payload);
            return ok(res, doc, "Hero created.", 201);
        }



    } catch (err) {
        if (err?.code === 11000) {
            return fail(res, "Duplicate key error.", 409, { keyValue: err.keyValue });
        }
        return fail(res, err?.message || "Failed to create Hero.", 500);
    }
}

/**
 * GET /api/admin/hero/
 * Query:
 *  - page (default 1)
 *  - limit (default 10)
 *  - sort (default -createdAt) e.g., sort=createdAt or sort=-fk
 *  - fk (filter by fk)
 *  - q (search in title/desc)
 */
async function getAllHeroes(req, res) {
    try {
        // Fetch all Contacts items, newest first
        const items = await HeroModel.find()
            .sort({ createdAt: -1 }) // descending order
            .lean();

        return ok(res, items, "Contacts fetched.");
    } catch (err) {
        return fail(res, err.message || "Failed to fetch Contacts.", 500);
    }
}



module.exports = {

    createHero,
    getAllHeroes,

};
