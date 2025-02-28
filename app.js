const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
const path = require("path")
const bcrypt = require("bcrypt")
const connectDB = require("./db.js");
const userModel = require("./models/user");
const postModel = require("./models/post")
const adminModel = require("./models/admin")
const groupModel = require("./models/group")
const Contact = require("./models/contact");
const jwt = require("jsonwebtoken");
const post = require("./models/post");
const { permission } = require("process");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,'public')));
app.use(cookieParser());

connectDB();

app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    next();
});

app.get("/", isLoggedIn, (req, res) => {    
    res.redirect("/index")  
});

app.get("/index", isLoggedIn, async(req,res)=>{
    let posts = await postModel
        .find({
            visibility: { $ne: "restrict" }, 
        })
        .populate("user");
    posts = posts.filter(post => post.user && post.user.permission !== "block");
    let user = await userModel.findById(req.user._id);
    if(user.permission === "block") return res.redirect("/logout")
    res.render("index/index",{posts,user});
    
})

app.get("/contact", isLoggedIn, async (req, res) => {
    try {        
        const user = await userModel.findById(req.user._id).populate({
            path: "contacts",
            populate: { path: "posts" } 
        }).exec();

        const contactUsernames = user.contacts.map(contact => contact.username);
        res.render("index/contact", { post: user.contacts,user });
        
    } catch (error) {
        console.error("Error fetching contacts:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/delete-contact/:id", isLoggedIn, async (req, res) => {
        const contactId = req.params.id;
        await userModel.findByIdAndUpdate(req.user._id, {
            $pull: { contacts: contactId }
        });

        res.redirect("/contact"); 
});

app.get("/mydata",isLoggedIn,async(req,res)=>{
    let user = await userModel.findById(req.user._id)
    let posts = await postModel.find({ user: req.user._id }).populate("user");

    res.render("index/mydata", { posts,user });
})

app.get("/add",isLoggedIn,(req,res)=>{
    res.render("index/aud/add_data")
})

app.post("/edit/:id", isLoggedIn, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.id);
        
        if (!post) {
            return res.status(404).send("Post not found");
        }
        res.render("index/aud/ud", { post }); // Render an edit page with post data
    } catch (error) {
        console.error("Error fetching post for edit:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/update/:id", isLoggedIn, async (req, res) => {
    try {
        const { title, description } = req.body;
        await postModel.findByIdAndUpdate(req.params.id, {
            title,
            description
        });

        res.redirect("/mydata"); 
    } catch (error) {
        console.error("Error updating post:", error);
        res.status(500).send("Internal Server Error");
    }
});


app.delete("/delete/:id",async(req,res)=>{
    try {
        let postId = req.params.id;
        await postModel.findByIdAndDelete(postId);
        res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error("Error deleting post:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
})

app.delete("/group_delete/:id",async(req,res)=>{
    try {
        let postId = req.params.id;
        await postModel.findByIdAndDelete(postId);
        res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error("Error deleting post:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
})

app.post("/group_visibility/:id",async(req,res)=>{
    let post = await postModel.findById(req.params.id);
    
    if(post.visibility === "public"){
        post.visibility = "restrict";
    }else{
        post.visibility = "public";
    }
    await post.save();
    res.redirect("/admin/groups/group");
})

app.post("/group_block/:id",async(req,res)=>{
    let post = await postModel.findById(req.params.id).populate("user");
    if(post.user.permission === "normal"){
        post.user.permission = "block";   
    }else{
        post.user.permission = "normal";
    }
    await post.user.save();    
    res.redirect("/admin/groups/group");
})


app.get("/create",(req,res)=>{
    res.render("user/signup/signup");
})

app.get("/admin/add_groups",isLoggedIn,(req,res)=>{
    res.render("admin/add_groups");
})

app.post("/admin/add_groups",isLoggedIn,(req,res)=>{
    let { username, email, password } = req.body;

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let create_group = await groupModel.create({
                username,
                email,
                permission: "Full Access",
                password: hash
            });
            res.redirect("/admin/admin");
        });
    });
})

app.post("/delete-group/:id", async (req, res) => {
    const groupId = req.params.id;
    await groupModel.findByIdAndDelete(groupId);
    console.log(groupId);
    
    res.redirect("/admin/admin"); 
});

app.post("/faccess/:id", async (req, res) => {
        const group = await groupModel.findById(req.params.id);
        
        if (group.permission === "Full Access") {
            return res.status(404).send("Already has full access");
        }else{
            group.permission = "Full Access";
        }
        await group.save();
    res.redirect("/admin/admin"); 
});

app.post("/laccess/:id", async (req, res) => {
    const group = await groupModel.findById(req.params.id);
    
    if (group.permission === "Full Access") {
        group.permission = "Limited Access";
    }else{
        return res.status(404).send("Already has limited access");
    }
    await group.save();
    res.redirect("/admin/admin"); 
});

app.post('/create', async (req,res)=>{
    let { username, email, phone, password } = req.body;

    let user = await userModel.findOne({ $or: [{ email }, { username }] });
    if (user) return res.status(500).send("User already registered");

    let phone_check = await userModel.findOne({ $or: [{ phone }, { username }] });
    if (phone_check) return res.status(500).send("Contact already registered");
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let create_user = await userModel.create({
                username,
                email,
                phone,
                permission: "normal",
                password: hash
            });
            let token = jwt.sign({ _id: create_user._id, email: create_user.email }, "SECRET_KEY", { expiresIn: "1h" });
            res.cookie("token", token, { httpOnly: true });
            res.redirect("/index");
        });
    });
})

app.post("/admin/signup", async (req, res) => {
    let { username, email, phone, password } = req.body;

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let create_admin = await adminModel.create({
                username,
                email,
                phone,
                password: hash
            });
            let admin_token = jwt.sign({ _id: create_admin._id, email: create_admin.email }, "ADMIN_SECRET_KEY", { expiresIn: "1h" });
            res.cookie("admin_token", admin_token, { httpOnly: true});
            res.redirect("/admin/admin");
        });
    });
})

app.get("/admin/signup",async(req,res)=>{
    let adminCount = await adminModel.countDocuments();

    if (adminCount > 0) {
        return res.redirect("/admin/login");
    }
    res.render("admin/signup/signup")
})

app.post("/admin/login", async (req,res)=>{
    let admin = await adminModel.findOne({ username: req.body.username });
    if (!admin) return res.status(400).send("Invalid username or password");

    bcrypt.compare(req.body.password, admin.password, (err, result) => {
        if (result) {
            let admin_token = jwt.sign({ _id: admin._id, email: admin.email }, "ADMIN_SECRET_KEY", { expiresIn: "1h" });
            res.cookie("admin_token", admin_token, { httpOnly: true });
            res.redirect("/admin/admin");
        } else {
            res.status(400).send("Invalid username or password");
        }
    });
})

app.get("/admin/login",(req,res)=>{
    res.render("admin/login/login")
})

app.get("/admin/admin",isLoggedIn, async(req,res)=>{
    let group_data = await groupModel.find()
    res.render("admin/admin",{group_data});
    console.log(group_data);
})

app.post("/admin/groups/login",async(req,res)=>{
    let group = await groupModel.findOne({ username: req.body.username });
    if (!group) return res.status(400).send("Invalid username or password");

    bcrypt.compare(req.body.password, group.password, (err, result) => {
        if (result) {
            let group_token = jwt.sign({ _id: group._id, email: group.email }, "GROUP_SECRET_KEY", { expiresIn: "1h" });
            res.cookie("group_token", group_token, { httpOnly: true });
            res.redirect("/admin/groups/group");
        } else {
            res.status(400).send("Invalid username or password");
        }
    });
})

app.get("/admin/groups/login",(req,res)=>{
    res.render("admin/group/login")
})

app.get("/admin/groups/group",isLoggedIn,async(req,res)=>{
    let posts = await postModel.find().populate("user");
    let group = await groupModel.findById(req.group._id)
    res.render("admin/group/group",{ posts, group});
})

app.get("/login", (req, res) => {
    res.render("user/login/login");
});

app.post("/login",async (req,res)=>{
    let user = await userModel.findOne({ username: req.body.username });
    if (!user) return res.status(400).send("Invalid username or password");
    
    if(user.permission === "block") return res.status(400).send("Unfortunately you are blocked...")

    bcrypt.compare(req.body.password, user.password, (err, result) => {
        if (result) {
            let token = jwt.sign({ _id: user._id, email: user.email }, "SECRET_KEY", { expiresIn: "1h" });
            res.cookie("token", token, { httpOnly: true });
            res.redirect("/index");
        } else {
            res.status(400).send("Invalid username or password");
        }
    });
})

app.post("/add",isLoggedIn, async (req,res)=>{
    let { title, description } = req.body;
    const userId = req.user._id;
    try {
        let create_post = await postModel.create({
            title,
            description,
            visibility: "public",
            user: userId
        });
        let user = await userModel.findOne({ _id: userId });
        if (!user) {
            console.error("User not found for ID:", userId);
            return res.status(404).json({ error: "User not found" });
        }
        user.posts.push(create_post._id);
        await user.save();
        res.redirect("./index");
    } catch (error) {
        console.error("Error in /add route:", error);
        res.status(500).send("Internal Server Error");
    }
})

app.post("/add-contact", isLoggedIn, async (req, res) => {
    try {
        let { userId } = req.body;
        const loggedInUserId = req.user._id;

        if (!userId || userId.trim() === "") {
            return res.status(400).json({ success: false, message: "Invalid userId!" });
        }

        const mongoose = require("mongoose");
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid ObjectId format!" });
        }

        if (loggedInUserId.toString() === userId) {
            return res.json({ success: false, message: "You cannot add yourself as a contact!" });
        }

        let user = await userModel.findById(loggedInUserId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (user.contacts.includes(userId)) {
            return res.json({ success: false, message: "User already in contacts!" });
        }

        user.contacts.push(userId);
        await user.save();

        res.json({ success: true, message: "Contact added successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});


app.get("/logout",(req,res)=>{
    res.clearCookie("token");
    res.redirect("/login");
})

app.get("/glogout",(req,res)=>{
    res.clearCookie("group_token")
    res.redirect("/admin/groups/login");
})

app.get("/alogout",(req,res)=>{
    res.clearCookie("admin_token")
    res.redirect("/admin/login");
})

app.all("*", (req, res) => {
    res.status(404).render("./index/404");
});

function isLoggedIn(req,res,next){
    const token = req.cookies.token; 
    const admin_token = req.cookies.admin_token; 
    const group_token = req.cookies.group_token;
    
    if (!token && !admin_token && !group_token) {
        return res.redirect("/login"); 
    }

    try {
        let decoded;
        
        if (req.originalUrl.startsWith("/admin")) {
            if (req.originalUrl.startsWith("/admin/groups")) {
                if (!group_token) return res.redirect("/admin/login"); 
                decoded = jwt.verify(group_token, "GROUP_SECRET_KEY");
                req.group = decoded; 
            } else {
                if (!admin_token) return res.redirect("/admin/login"); 
                decoded = jwt.verify(admin_token, "ADMIN_SECRET_KEY");
                req.admin = decoded; 
            }
        } else {
            if (!token) return res.redirect("/login"); 
            decoded = jwt.verify(token, "SECRET_KEY");
            req.user = decoded;
        }

        next();
    } catch (error) {
        res.clearCookie("token");
        res.clearCookie("admin_token");
        res.redirect(req.originalUrl.startsWith("/admin") ? "/admin/login" : "/login");
    }
}

app.listen(8085,()=>{
    console.log("server is running");
    
})  