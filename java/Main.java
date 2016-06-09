public class Main {

    public static void main(String[] args) throws Exception {
        System.out.println("Java: Line4");
        System.out.println("Java: Line5");
        if(true) throw new Exception("ooops");
        System.out.println("Java: Line7");
    }
}