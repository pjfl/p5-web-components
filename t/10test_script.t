use t::boilerplate;

use Test::More;

use_ok 'Web::Components';

{  package TestApp::Model::Dummy;

   use Class::Usul::Types qw( SimpleStr );
   use Moo;

   with 'Web::Components::Role';

   has '+moniker' => default => 'dummy';

   has 'foo' => is => 'ro', isa => SimpleStr, default => 'bar';

   $INC{ 'TestApp/Model/Dummy.pm' } = __FILE__;
}

{  package TestApp::Server;

   use Class::Usul;
   use Class::Usul::Types qw( Plinth );
   use Moo;

   has '_usul' => is => 'lazy', isa => Plinth, builder => sub {
      Class::Usul->new( config => { appclass => 'TestApp' } ) },
      handles  => [ 'config', 'debug', 'l10n', 'lock', 'log' ];

   with q(Web::Components::Loader);

   $INC{ 'TestApp/Server.pm' } = __FILE__;
}

my $server = TestApp::Server->new;

is $server->dispatch_request, 0, 'Default dispatch';
is $server->models->{dummy}->foo, 'bar', 'Loads model';

done_testing;

# Local Variables:
# mode: perl
# tab-width: 3
# End:
# vim: expandtab shiftwidth=3:
