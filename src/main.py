"""
Main Cookie Lab prediction pipeline.

Recipe
-> Features
-> Validation
-> Science prediction
-> Ingredient interactions
-> ML prediction
-> Confidence
"""


from feature_engineering import engineer_cookie_features
from science_engine import predict_cookie
from validation_checker import check_cookie_validity
from interactions import apply_interactions
from confidence_engine import calculate_confidence
from ml_model import predict_ml
from explanation_engine import generate_explanations



def analyze_cookie(recipe):

    # ----------------------------------
    # 1. Feature engineering
    # ----------------------------------

    features = engineer_cookie_features(recipe)



    # ----------------------------------
    # 2. Check if cookie is valid
    # ----------------------------------

    validity = check_cookie_validity(
        features
    )


    if not validity["valid"]:

        return {

            "cookie_failed": True,

            "reason": validity["failures"],

            "warnings": validity["warnings"]

        }



    # ----------------------------------
    # 3. Science engine prediction
    # ----------------------------------

    prediction = predict_cookie(
        features
    )



    # ----------------------------------
    # 4. Apply ingredient interactions
    # ----------------------------------

    prediction = apply_interactions(
        prediction,
        features
    )



    # ----------------------------------
    # 5. Machine learning prediction
    # ----------------------------------

    ml_prediction = predict_ml(
        features
    )



    # ----------------------------------
    # 6. Confidence
    # ----------------------------------

    confidence = calculate_confidence(

        features,

        prediction,

        validity["warnings"],

        ml_prediction

    )
    explanations = generate_explanations(
        recipe,
        prediction,
        ml_prediction
    )



    # ----------------------------------
    # Final output
    # ----------------------------------

    return {

        "cookie_failed": False,

        "prediction": prediction,

        "ml_prediction": ml_prediction,

        "confidence": confidence,

        "warnings": validity["warnings"],

        "features": features, 

        "explanations": explanations

    }





# ----------------------------------
# Test recipe
# ----------------------------------

if __name__ == "__main__":


    toll_house = {


        "flour_g": 280,

        "butter_g": 113,

        "shortening_g": 0,

        "oil_g": 0,


        "white_sugar_g": 150,

        "light_brown_sugar_g": 150,

        "dark_brown_sugar_g": 0,


        "egg_g": 50,

        "egg_yolk_g": 0,


        "baking_soda_g": 4.6,

        "baking_powder_g": 0,


        "cornstarch_g": 0,

        "chocolate_g":170,


        "butter_state": "softened",

        "flour_type": "ap",

        "mixing_method": "creamed",

        "dough_temperature": "room",


        "chill_hours":0,


        "bake_temp_f":350,

        "bake_time_min":10,


        "cookie_size_g":30

    }



    result = analyze_cookie(
        toll_house
    )


    print("\nCOOKIE LAB RESULT")
    print("-------------------")


    print("\nSCIENCE:")
    print(result["prediction"])


    print("\nML:")
    print(result["ml_prediction"])


    print("\nCONFIDENCE:")
    print(result["confidence"])


    print("\nWARNINGS:")
    print(result["warnings"])

    