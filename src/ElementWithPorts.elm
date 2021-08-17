port module ElementWithPorts exposing (main)

import Browser
import Html exposing (..)
import Html.Events exposing (..)
import Random
import Time



-- MAIN


main : Program () Model Msg
main =
    Browser.element
        { init = init
        , update = update
        , subscriptions = subscriptions
        , view = view
        }



-- MODEL


type alias Model =
    { dieFace : Int
    , time : Int
    }


init : () -> ( Model, Cmd Msg )
init _ =
    ( Model 1 0
    , Cmd.none
    )



-- UPDATE


type Msg
    = Roll
    | NewFace Int
    | GetMillis Int


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Roll ->
            ( model
            , Random.generate NewFace (Random.int 1 6)
            )

        NewFace face ->
            ( { model | dieFace = face }
            , newFace face
            )

        GetMillis millis ->
            ( { model | time = millis }
            , Cmd.none
            )



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions _ =
    [ Time.every 1000 (Time.posixToMillis >> GetMillis)
    , getMillis GetMillis
    ]
        |> Sub.batch



-- PORTS


port newFace : Int -> Cmd msg


port getMillis : (Int -> msg) -> Sub msg



-- VIEW


view : Model -> Html Msg
view model =
    div []
        [ h1 [] [ text (String.fromInt model.dieFace) ]
        , button [ onClick Roll ] [ text "Roll" ]
        , h2 [] [ text <| "Millis:" ++ String.fromInt model.time ]
        ]
