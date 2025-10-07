
import Jwt from "jsonwebtoken"
import { User } from "../models/user.js"
const registerUser = async(req,res) => {
    //get user details from frontend
    //validate user details - not empty
    //check if user already exist
    //create user object - create entry in db
    //remove password and refresh token field from response
    //check for user creation
    //return res

    const {username, fullName, email, password} = req.body
    console.log("username: ", username)
    console.log("FullName: ", fullName)
    console.log("Email: ", email)
    console.log("Password: ", password)

    if(
        [username, fullName, email, password].some((fields) =>{
            fields?.trim() == ""
        })
    ){
        return res.json({status: "400", message: "All Fields are Required"})
    }

    const existingUser = await User.findOne({
        $or: [{email}, {username}]
    })

    if(existingUser){
        return res.json({message: "user with username or email already exist"})
    }

    const user = await User.create({
        username: username.toLowerCase(),
        fullName,
        email,
        password
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        return res.json({status: "500", message: "server was unable to store the user"})
    }

    return res.status(200).json({
        message: "User Registered Successfully"
    })

}

const generateAccessAndRefreshToken = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken

        await user.save({validateBeforeSave: false})

        return { accessToken, refreshToken}
        
    } catch (error) {
        console.log("500 - something went wrong while generating Access and Refresh token")
    }
}

const loginUser = async(req, res) => {
    //req body <- data
    //username or email
    //find user
    //password
    //access and refresh token
    //send cookie

    const {email, password} = req.body

    if(!email){
        return res.json({status: "400", message: "username must not be empty"})
    }

    const user = await User.findOne({email})

    if(!user){
        return res.json({status: "404", message: "This user doesnot exist"})
    }

    const passwordValidation = await user.isPasswordCorrect(password)
    console.log("password validation", passwordValidation);
    if(!passwordValidation){
        return res.status(401).json({ message: "Invalid user credentials" });
    }


    const { accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
        statusCode: 200,
        message: "User Logged in Successfully",
        data: {
          user: loggedInUser,
          accessToken,
          refreshToken
        }
      })

}

const logoutUser = async(req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken",options)
    .json({
        message : "User Logged out Successfully"
    })
}

const refreshAccessToken = async(req,res) =>{
    const incommingRefreshToken = req.cookies?.accessToken || req.body.accessToken

    if(!incommingRefreshToken){
        console.log("401 - Unathurized Request")
    }

    const decodedToken = jwt.verify(incommingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken._id)

    if(!user){
        console.log("401 - Invalid Refresh Token")
    }

    if(incommingRefreshToken !== user?.refreshToken){
        console.log("401 - Refresh Token Expired or Used")
    }

    options = {
        httpOnly: true,
        secure: true
    }

    const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
        200,
        {accessToken, refreshToken: newRefreshToken},
        "Access Token Refreshed"
    )
}

const changeCurrentPassword = async(req,res) => {
    const {newPassword, oldPasword} = req.body

    const user = await User.findById(req.user._id)
    
    const isPasswordCorrect = user.isPasswordCorrect(oldPasword)

    if(!isPasswordCorrect) {
        return res.json({status:"400", message: "Invalid Old Password"})
    }

    user.password = newPassword
    user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json({status: "200", message: "Password Has been Changed Successfully"}    )

    
}

const updateUserAccountDetails = async(req,res) => {
    const {fullName, email} = req.body

    if(!email || !fullName){
        return res.json({status: "400", message: "All fields are required"})
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json({status:"200", data: user, message:"User Account Details has been Updated Successfully"})
}

const getCurrentUser = async(req,res) => {
    return res.json(200, req.user, "Current User fetched Successfully")
}

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    updateUserAccountDetails,
    getCurrentUser
}
